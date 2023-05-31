#!/usr/bin/env node
// Copyright 2023-2023 zc.zhang authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { importDirect } from './import.mjs';

process.env.NODE_OPTIONS = `--experimental-vm-modules${process.env.NODE_OPTIONS ? ` ${process.env.NODE_OPTIONS}` : ''}`;

await importDirect('z-dev-run-test', 'jest-cli/bin/jest');
