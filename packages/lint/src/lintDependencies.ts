// Copyright 2023-2023 zc.zhang authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { execSync } from 'child_process';
import glob from 'glob';
import { ImportedPackageType, parse as parseTs } from 'parse-imports-ts';
import { join } from 'path';
import throatFactory from 'throat';

import { error } from './feedback.js';
import { readFileAsync } from './fs.js';
import { PackageJson, readPackageJson } from './package-json.js';

const MAX_NUMBER_OF_FILES_CONCURENTLY_OPENED = 50;
const throat = throatFactory(MAX_NUMBER_OF_FILES_CONCURENTLY_OPENED);

const ignoredDependencies = [
  // node
  'crypto',
  'fs',
  'path',
  'process',
  'readline',
  'util',
  // other
  '@jest/globals',
  'react',
  'react-dom',
  'react-native'
];

enum PackageType {
  NormalImport,
  DevImport
}

enum FileType {
  Source,
  Test
}

interface FileDetails {
  file: string;
  type: FileType;
}

function convertType(packageType: ImportedPackageType, fileType: FileType): PackageType {
  switch (fileType) {
    case FileType.Test:
      return PackageType.DevImport;

    default:
      switch (packageType) {
        case ImportedPackageType.NormalImport:
          return PackageType.NormalImport;
        case ImportedPackageType.TypeImport:
          return PackageType.DevImport;
        default:
          throw new Error(`Type ${packageType} not supported`);
      }
  }
}

interface ImportDetails {
  name: string;
  files: string[];
  type: PackageType;
}

async function parseFileTs(file: FileDetails): Promise<ImportDetails[]> {
  const code = await readFileAsync(file.file);
  const result = parseTs(code, file.file);

  return result.map(({ name, type }) => ({
    files: [file.file],
    name,
    type: convertType(type, file.type)
  }));
}

async function parseFile(file: FileDetails): Promise<ImportDetails[]> {
  try {
    return parseFileTs(file);
  } catch (e) {
    error(`Could not parse "${file}"`);
    error(e);

    return [];
  }
}

const getFileList = (sourceFiles: string[], testFiles: string[]): FileDetails[] =>
  sourceFiles.map((file): FileDetails => {
    const type = testFiles.includes(file) ? FileType.Test : FileType.Source;

    return { file, type };
  });

async function getImportsForFiles(files: FileDetails[]): Promise<ImportDetails[]> {
  const imports = await Promise.all(files.map((f: FileDetails): Promise<ImportDetails[]> => throat(() => parseFile(f))));

  return imports.reduce((acc: ImportDetails[], list: ImportDetails[]): ImportDetails[] => {
    list?.forEach((item) => {
      const newImport = acc.find((existing) => existing.name === item.name);

      if (newImport) {
        newImport.files = [...new Set([...newImport.files, ...item.files])];
        newImport.type = newImport.type === PackageType.NormalImport ? PackageType.NormalImport : item.type;
      } else {
        acc.push({ ...item, files: [...item.files] });
      }
    });

    return acc;
  }, [] as ImportDetails[]);
}

const getFiles = () => (pattern: string) => glob(pattern, { cwd: 'src' }).then((files) => files.map((file) => join('src', file)));

function getSourceFiles(): Promise<string[]> {
  const pattern = '**/*.{ts,tsx,js,jsx,mjs,mts,cts}';

  return getFiles()(pattern);
}

async function getTestFiles(): Promise<string[]> {
  const lists: string[][] = await Promise.all(['**/__tests__/**/*.?(m)[jt]s?(x)', '**/?(*.)+(spec|test).?(m)[jt]s?(x)'].map((pattern) => getFiles()(pattern)));
  let result: string[] = [];

  for (let i = 0; i < lists.length; i += 1) {
    result = [...new Set([...result, ...lists[i]])];
  }

  return result;
}

interface Errors {
  errors: string[];
  warns: string[];
}

function getErrors(base: string, packageJson: PackageJson, imports: ImportDetails[], fix: boolean): Errors {
  const result: Errors = { errors: [], warns: [] };

  // Report any package used in the src folder that are not specified in the dependencies or peerDependencies.
  imports.forEach((i) => {
    if (i.type === PackageType.NormalImport) {
      if (packageJson.dependencies.includes(i.name)) {
        return;
      }

      if (packageJson.peerDependencies.includes(i.name)) {
        return;
      }

      if (ignoredDependencies.includes(i.name)) {
        return;
      }

      if (packageJson.name === i.name) {
        return;
      }

      if (i.files.length > 0) {
        if (fix) {
          execSync(`yarn add ${i.name}`);
        } else {
          result.errors.push(`The package "${i.name}" is used in the files ${i.files.map((file) => `"${base}/${file}"`).join(',')}. but it is missing from the dependencies in package.json.`);
        }
      }
    }
  });

  return result;
}

export async function lintDependencies(base: string, fix = false): Promise<Errors> {
  const packageJson = await readPackageJson();
  const [sourceFiles, testFiles] = await Promise.all([getSourceFiles(), getTestFiles()]);
  const files = getFileList(sourceFiles, testFiles);
  const imports = await getImportsForFiles(files);

  return getErrors(base, packageJson, imports, fix);
}
