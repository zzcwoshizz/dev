// Copyright 2023-2023 zc.zhang authors & contributors
// SPDX-License-Identifier: Apache-2.0

const resolver = require('./babel-resolver.cjs');

module.exports = function (isEsm, doRewrite) {
  return resolver([
    '@babel/plugin-proposal-nullish-coalescing-operator',
    '@babel/plugin-proposal-numeric-separator',
    '@babel/plugin-proposal-optional-chaining',
    [
      '@babel/plugin-transform-runtime',
      {
        helpers: true,
        regenerator: true,
        useESModules: isEsm
      }
    ],
    '@babel/plugin-syntax-bigint',
    '@babel/plugin-syntax-dynamic-import',
    '@babel/plugin-syntax-import-assertions',
    '@babel/plugin-syntax-import-meta',
    '@babel/plugin-syntax-top-level-await',
    'babel-plugin-styled-components',
    doRewrite && [
      'babel-plugin-module-extension-resolver',
      {
        dstExtension: '.js',
        srcExtensions: ['.ts', '.tsx', '.js', '.jsx']
      }
    ]
  ]);
};
