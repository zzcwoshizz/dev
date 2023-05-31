// Copyright 2023-2023 zc.zhang authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { tester } from '.';

tester();

console.log('  (2)', typeof require === 'undefined' ? 'esm' : 'cjs');
