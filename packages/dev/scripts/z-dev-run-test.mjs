#!/usr/bin/env node

import { importDirect } from './import.cjs';

process.env.NODE_OPTIONS = `--experimental-vm-modules${
  process.env.NODE_OPTIONS ? ` ${process.env.NODE_OPTIONS}` : ''
}`;

importDirect('z-dev-run-test', 'jest-cli/bin/jest');
