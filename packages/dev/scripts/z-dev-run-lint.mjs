#!/usr/bin/env node
// Copyright 2023-2023 zc.zhang authors & contributors
// SPDX-License-Identifier: Apache-2.0

import yargs from 'yargs';

import { __dirname } from './dirname.mjs';
import { execSync } from './execute.mjs';

console.log('$ z-dev-run-lint', process.argv.slice(2).join(' '));

const argv = yargs(process.argv.slice(2))
  .options({
    'skip-eslint': {
      description: 'Skips running eslint',
      type: 'boolean'
    },
    'skip-tsc': {
      description: 'Skips running tsc',
      type: 'boolean'
    }
  })
  .strict().argv;

if (!argv['skip-eslint']) {
  // We don't want to run with fix on CI
  const extra = process.env.GITHUB_REPOSITORY ? '' : '--fix';

  execSync(`yarn z-exec-eslint ${extra} --resolve-plugins-relative-to ${__dirname} --ext .js,.cjs,.mjs,.ts,.tsx ${process.cwd()}`);
}

if (!argv['skip-tsc']) {
  execSync('yarn z-exec-tsc --noEmit --emitDeclarationOnly false --pretty --project tsconfig.eslint.json');
}
