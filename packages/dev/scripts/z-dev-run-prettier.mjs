#!/usr/bin/env node
// Copyright 2023-2023 zc.zhang authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { __dirname } from './dirname.mjs';
import { execSync } from './execute.mjs';

console.log('$ z-dev-run-prettier', process.argv.slice(2).join(' '));

execSync(`yarn z-exec-prettier --write ${__dirname}`);
