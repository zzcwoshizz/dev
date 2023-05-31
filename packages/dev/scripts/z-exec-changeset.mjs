#!/usr/bin/env node
// Copyright 2023-2023 zc.zhang authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { importDirect } from './import.mjs';

await importDirect('changeset', '@changesets/cli/bin.js');
