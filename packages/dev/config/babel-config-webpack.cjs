// Copyright 2023-2023 zc.zhang authors & contributors
// SPDX-License-Identifier: Apache-2.0

const general = require('./babel-general.cjs');
const plugins = require('./babel-plugins.cjs');
const presets = require('./babel-presets.cjs');

module.exports = {
  ...general,
  plugins: plugins(true, false),
  presets: presets(true)
};
