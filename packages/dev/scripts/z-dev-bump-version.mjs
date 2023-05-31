#!/usr/bin/env node
// Copyright 2023-2023 zc.zhang authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { execSync } from './execute.mjs';

console.log('$ z-dev-bump-version', process.argv.slice(2).join(' '));

execSync('z-exec-changeset version');

execSync('yarn');
