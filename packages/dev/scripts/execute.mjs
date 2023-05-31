// Copyright 2023-2023 zc.zhang authors & contributors
// SPDX-License-Identifier: Apache-2.0

import cp from 'child_process';

import { importPath } from './import.mjs';

export function execSync(cmd, noLog) {
  !noLog && console.log(`$ ${cmd}`);

  cp.execSync(cmd, { stdio: 'inherit' });
}

export function execNode(name, cmd) {
  const args = process.argv.slice(2).join(' ');

  console.log(`$ ${name}${args ? ` ${args}` : ''}`);

  return execSync(`${importPath(cmd)}${args ? ` ${args}` : ''}`, true);
}
