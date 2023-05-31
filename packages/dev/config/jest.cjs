// Copyright 2023-2023 zc.zhang authors & contributors
// SPDX-License-Identifier: Apache-2.0

const path = require('path');
const { defaults } = require('jest-config');

const { getPackagesSync } = require('@manypkg/get-packages');

const { packages } = getPackagesSync(process.cwd());

module.exports = {
  moduleFileExtensions: [...defaults.moduleFileExtensions, 'ts', 'tsx'],
  modulePathIgnorePatterns: packages.map((pkg) => path.join(pkg.dir, 'build')),
  // custom resolver to do TS-like imports
  resolver: require.resolve('./jest-resolver.cjs'),
  // See https://jestjs.io/docs/configuration#extraglobals-arraystring
  sandboxInjectedGlobals: ['Math'],
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': require.resolve('babel-jest')
  }
};
