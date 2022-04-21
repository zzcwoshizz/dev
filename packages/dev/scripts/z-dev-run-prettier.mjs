#!/usr/bin/env node
// [object Object]
// SPDX-License-Identifier: Apache-2.0

import { __dirname } from './dirname.mjs';
import execSync from './execSync.mjs';

console.log('$ z-dev-run-prettier', process.argv.slice(2).join(' '));

execSync(`yarn z-exec-prettier --write ${__dirname}`);
