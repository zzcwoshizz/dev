#!/usr/bin/env node
// Copyright 2023-2023 zc.zhang authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { getPackagesSync } from '@manypkg/get-packages';
import fs from 'fs';
import path from 'path';
import semver from 'semver';
import yargs from 'yargs';

import { execSync } from './execute.mjs';

const { packages, rootPackage } = getPackagesSync(process.cwd());

const TYPES = ['major', 'premajor', 'minor', 'preminor', 'patch', 'prepatch', 'prerelease'];

const [type] = yargs(process.argv.slice(2)).demandCommand(1).argv._;

if (!TYPES.includes(type)) {
  throw new Error(`Invalid version bump "${type}", expected one of ${TYPES.join(', ')}`);
}

console.log('$ z-dev-version', process.argv.slice(2).join(' '));

packages
  .concat(rootPackage)
  .map((pkg) => {
    const newVer = semver.inc(pkg.packageJson.version, type);

    if (newVer) {
      pkg.packageJson.version = newVer;
    } else {
      throw new Error(`Invalid version bump with package ${pkg.packageJson.name}`);
    }

    return pkg;
  })
  .forEach((pkg) => {
    fs.writeFileSync(path.resolve(pkg.dir, 'package.json'), `${JSON.stringify(pkg.packageJson, null, 2)}\n`);
  });

execSync('yarn');
