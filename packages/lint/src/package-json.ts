// Copyright 2023-2023 zc.zhang authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { resolve } from 'path';

import { readFileAsync } from './fs.js';

export interface PackageJson {
  name: string;
  version: string;
  dependencies: string[];
  devDependencies: string[];
  peerDependencies: string[];
}

export async function readPackageJson(): Promise<PackageJson> {
  const code = await readFileAsync(resolve(process.cwd(), 'package.json'));
  const pkg = JSON.parse(code);
  const dependencies = pkg.dependencies ? Object.keys(pkg.dependencies) : [];
  const devDependencies = pkg.devDependencies ? Object.keys(pkg.devDependencies) : [];
  const peerDependencies = pkg.peerDependencies ? Object.keys(pkg.peerDependencies) : [];

  return { ...pkg, dependencies, devDependencies, peerDependencies };
}
