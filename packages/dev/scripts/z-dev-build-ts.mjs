#!/usr/bin/env node
// Copyright 2023-2023 zc.zhang authors & contributors
// SPDX-License-Identifier: Apache-2.0

import babel from '@babel/cli/lib/babel/dir.js';
import { getPackagesSync } from '@manypkg/get-packages';
import fs from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';

import { copySync } from './copy.mjs';
import { __dirname } from './dirname.mjs';
import { execSync } from './execute.mjs';

const { packages, rootPackage } = getPackagesSync(process.cwd());

const BL_CONFIGS = ['js', 'cjs'].map((e) => `babel.config.${e}`);
const WP_CONFIGS = ['js', 'cjs'].map((e) => `webpack.config.${e}`);
const CPX = ['patch', 'js', 'cjs', 'mjs', 'json', 'd.ts', 'css', 'gif', 'hbs', 'jpg', 'png', 'svg'].map((e) => `src/**/*.${e}`).concat(['package.json', 'README.md', 'LICENSE']);

console.log('$ z-dev-build-ts', process.argv.slice(2).join(' '));

// webpack build
function buildWebpack() {
  const config = WP_CONFIGS.find((c) => fs.existsSync(path.join(process.cwd(), c)));

  execSync(`yarn z-exec-webpack --config ${config} --mode production`);
}

// compile via babel, either via supplied config or default
async function buildBabel(type) {
  const configs = BL_CONFIGS.map((c) => path.join(process.cwd(), `../../${c}`));
  const outDir = path.join(process.cwd(), `build${type === 'esm' ? '' : '-cjs'}`);

  await babel.default({
    babelOptions: {
      configFile: type === 'esm' ? path.join(__dirname, '../config/babel-config-esm.cjs') : configs.find((f) => fs.existsSync(f)) || path.join(__dirname, '../config/babel-config-cjs.cjs')
    },
    cliOptions: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      filenames: ['src'],
      ignore: '**/*.d.ts',
      outDir,
      outFileExtension: '.js'
    }
  });

  // rewrite a skeleton package.json with a type=module
  if (type !== 'esm') {
    CPX.forEach((s) => copySync(s, 'build'));
  }
}

function witeJson(path, json) {
  fs.writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`);
}

function relativePath(value) {
  return `${value.startsWith('.') ? value : './'}${value}`.replace(/\/\//g, '/');
}

// creates an entry for the cjs/esm name
function createMapEntry(rootDir, jsPath, noTypes) {
  jsPath = relativePath(jsPath);

  const otherPath = jsPath.replace('./', './cjs/');
  const hasOther = fs.existsSync(path.join(`${rootDir}-cjs`, jsPath));
  const typesPath = jsPath.replace('.js', '.d.ts');
  const hasTypes = !noTypes && jsPath.endsWith('.js') && fs.existsSync(path.join(rootDir, typesPath));
  const field = hasOther
    ? {
        ...(hasTypes ? { types: typesPath } : {}),
        require: otherPath,
        // eslint-disable-next-line sort-keys
        default: jsPath
      }
    : hasTypes
    ? {
        types: typesPath,
        // eslint-disable-next-line sort-keys
        default: jsPath
      }
    : jsPath;

  if (jsPath.endsWith('.js')) {
    if (jsPath.endsWith('/index.js')) {
      return [jsPath.replace('/index.js', ''), field];
    } else {
      return [jsPath.replace('.js', ''), field];
    }
  }

  return [jsPath, field];
}

// find the names of all the files in a certain directory
function findFiles(buildDir, extra = '', exclude = []) {
  const currDir = extra ? path.join(buildDir, extra) : buildDir;

  return fs.readdirSync(currDir).reduce((all, jsName) => {
    const jsPath = `${extra}/${jsName}`;
    const fullPathEsm = path.join(buildDir, jsPath);
    const toDelete =
      // no test paths
      jsPath.includes('/test/') ||
      // // no tests
      ['.manual.', '.spec.', '.test.'].some((t) => jsName.includes(t)) ||
      // no .d.ts compiled outputs
      ['.d.js', '.d.cjs', '.d.mjs'].some((e) => jsName.endsWith(e)) ||
      // .d.ts without .js as an output
      (jsName.endsWith('.d.ts') && !fs.existsSync(path.join(buildDir, jsPath.replace('.d.ts', '.js'))));

    if (fs.statSync(fullPathEsm).isDirectory()) {
      findFiles(buildDir, jsPath).forEach((entry) => all.push(entry));
    } else if (toDelete) {
      const fullPathCjs = path.join(`${buildDir}-cjs`, jsPath);

      fs.unlinkSync(fullPathEsm);
      fs.existsSync(fullPathCjs) && fs.unlinkSync(fullPathCjs);
    } else {
      if (!exclude.some((e) => jsName === e)) {
        // this is not mapped to a compiled .js file (where we have dual esm/cjs mappings)
        all.push(createMapEntry(buildDir, jsPath));
      }
    }

    return all;
  }, []);
}

function tweakCjsPaths(buildDir) {
  const cjsDir = `${buildDir}-cjs`;

  fs.readdirSync(cjsDir)
    .filter((n) => n.endsWith('.js'))
    .forEach((jsName) => {
      const thisPath = path.join(cjsDir, jsName);

      fs.writeFileSync(
        thisPath,
        fs.readFileSync(thisPath, 'utf8').replace(
          // require("@zzcwoshizz/$1/$2")
          /require\("@zzcwoshizz\/([a-z-]*)\/(.*)"\)/g,
          'require("@zzcwoshizz/$1/cjs/$2")'
        )
      );
    });
}

function moveFields(pkg, fields) {
  fields.forEach((k) => {
    if (typeof pkg[k] !== 'undefined') {
      const value = pkg[k];

      delete pkg[k];

      pkg[k] = value;
    }
  });
}

// iterate through all the files that have been built, creating an exports map
function buildExports() {
  const buildDir = path.join(process.cwd(), 'build');

  mkdirp.sync(path.join(buildDir, 'cjs'));

  witeJson(path.join(buildDir, 'cjs/package.json'), { type: 'commonjs' });
  tweakCjsPaths(buildDir);

  const pkgPath = path.join(buildDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const listRoot = findFiles(buildDir, '', ['README.md', 'LICENSE']);

  if (!listRoot.some(([key]) => key === '.')) {
    const indexDef = relativePath(pkg.main).replace('.js', '.d.ts');

    // for the env-specifics, add a root key (if not available)
    listRoot.push([
      '.',
      {
        types: indexDef,
        // eslint-disable-next-line sort-keys
        'react-native': createMapEntry(buildDir, pkg['react-native'], true)[1],
        // eslint-disable-next-line sort-keys
        browser: createMapEntry(buildDir, pkg.browser, true)[1],
        node: createMapEntry(buildDir, pkg.main, true)[1]
      }
    ]);
  }

  // cleanup extraneous fields
  delete pkg.devDependencies;

  // replace workspace: version
  if (pkg.dependencies) {
    Object.entries(pkg.dependencies).forEach(([name]) => {
      const localPackage = packages.find(({ packageJson }) => packageJson.name === name);

      if (localPackage) {
        pkg.dependencies[name] = localPackage.packageJson.version;
      }
    });
  }

  if (!pkg.main && fs.existsSync(path.join(buildDir, 'index.d.ts'))) {
    pkg.main = 'index.js';
  }

  if (pkg.main) {
    const main = pkg.main.startsWith('./') ? pkg.main : `./${pkg.main}`;

    pkg.main = main.replace(/^\.\//, './cjs/');
    pkg.module = main;
    pkg.types = main.replace('.js', '.d.ts');
  }

  // Ensure the top-level entries always points to the CJS version
  ['browser', 'react-native'].forEach((k) => {
    if (typeof pkg[k] === 'string') {
      const entry = pkg[k].startsWith('./') ? pkg[k] : `./${pkg[k]}`;

      pkg[k] = entry.replace(/^\.\//, './cjs/');
    }
  });

  if (Array.isArray(pkg.sideEffects)) {
    pkg.sideEffects = pkg.sideEffects.map((s) => (s.endsWith('.cjs') ? s.replace(/^\.\//, './cjs/').replace('.cjs', '.js') : s));
  }

  pkg.type = 'module';

  pkg.exports = listRoot
    .filter(
      ([path, config]) =>
        // we handle the CJS path at the root below
        path !== './cjs/package.json' && (typeof config === 'object' || !listRoot.some(([, c]) => typeof c === 'object' && Object.values(c).some((v) => v === path)))
    )
    .sort((a, b) => a[0].localeCompare(b[0]))
    .reduce((all, [path, config]) => {
      const entry =
        typeof config === 'string'
          ? config
          : Object.entries({
              ...((pkg.exports && pkg.exports[path]) || {}),
              ...config
            })
              .sort(([a], [b]) => (a === 'types' ? -1 : b === 'types' ? 1 : 0))
              .reduce(
                (all, [key, value]) => ({
                  ...all,
                  [key]: value
                }),
                {}
              );

      return {
        ...all,
        ...(path === '.' ? { './cjs/package.json': './cjs/package.json', './cjs/*': './cjs/*.js' } : {}),
        [path]: entry
      };
    }, {});

  moveFields(pkg, ['main', 'module', 'browser', 'react-native', 'types', 'exports', 'dependencies', 'optionalDependencies', 'peerDependencies']);
  witeJson(pkgPath, pkg);

  // copy from build-cjs to build/cjs
  ['./build-cjs/**/*.js'].forEach((s) => copySync(s, 'build/cjs'));
}

function sortJson(json) {
  return Object.entries(json)
    .sort(([a], [b]) => a.localeCompare(b))
    .reduce((all, [k, v]) => ({ ...all, [k]: v }), {});
}

function orderPackageJson(repoPath, dir, json) {
  json.author = 'zc.zhang';
  json.bugs = `https://github.com/${repoPath}/issues`;
  json.homepage = `https://github.com/${repoPath}#readme`;
  json.license = 'Apache-2.0';
  json.repository = {
    ...(dir ? { directory: dir } : {}),
    type: 'git',
    url: `https://github.com/${repoPath}.git`
  };
  json.sideEffects = json.sideEffects || false;

  // sort the object
  const sorted = sortJson(json);

  // remove empty artifacts
  ['engines'].forEach((d) => {
    if (typeof json[d] === 'object' && Object.keys(json[d]).length === 0) {
      delete sorted[d];
    }
  });

  // move the different entry points to the (almost) end
  ['browser', 'electron', 'main', 'module', 'react-native'].forEach((d) => {
    delete sorted[d];

    if (json[d]) {
      sorted[d] = json[d];
    }
  });

  // move bin, scripts & dependencies to the end
  [
    ['bin', 'scripts'],
    ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies', 'resolutions']
  ].forEach((a) =>
    a.forEach((d) => {
      delete sorted[d];

      if (json[d] && Object.keys(json[d]).length) {
        sorted[d] = sortJson(json[d]);
      }
    })
  );

  witeJson(path.join(process.cwd(), 'package.json'), sorted);
}

function timeIt(label, fn) {
  const start = Date.now();

  fn();

  console.log(`${label} (${Date.now() - start}ms)`);
}

async function buildJs(repoPath, dir) {
  const pkgJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), './package.json'), 'utf-8'));
  const { name, version } = pkgJson;

  console.log(`*** ${name} ${version}`);

  orderPackageJson(repoPath, dir, pkgJson);

  if (!fs.existsSync(path.join(process.cwd(), '.skip-build'))) {
    if (fs.existsSync(path.join(process.cwd(), 'public'))) {
      buildWebpack();
    } else {
      await buildBabel('cjs');
      await buildBabel('esm');

      timeIt('Successfully built exports', () => buildExports());
    }
  }

  console.log();
}

async function main() {
  execSync('yarn z-dev-clean-build');

  if (rootPackage.packageJson.scripts && rootPackage.packageJson.scripts['build:extra']) {
    execSync('yarn build:extra');
  }

  const repoPath = rootPackage.packageJson.repository.url.split('https://github.com/')[1].split('.git')[0];

  orderPackageJson(repoPath, null, rootPackage.packageJson);
  execSync('yarn z-exec-tsc --build tsconfig.build.json');

  for (const pkg of packages) {
    process.chdir(pkg.dir);
    await buildJs(repoPath, pkg.relativeDir);
  }

  process.chdir(rootPackage.dir);
}

main().catch((error) => {
  console.error(error);
  process.exit(-1);
});
