#!/usr/bin/env node
// Copyright 2023-2023 zc.zhang authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { getPackagesSync } from '@manypkg/get-packages';
import conventionalChangelog from 'conventional-changelog';
import conventionalRecommendedBump from 'conventional-recommended-bump';
import fs from 'fs';
import yargs from 'yargs';

import whatBump from './conventional/bump-version.mjs';
import parserOpts from './conventional/parser-opts.mjs';
import writerOpts from './conventional/writer-opts.mjs';
import { execSync } from './execute.mjs';
import gitSetup from './gitSetup.mjs';

console.log('$ z-ci-ghact-build', process.argv.slice(2).join(' '));

const argv = yargs(process.argv.slice(2))
  .options({
    beta: {
      description: 'Is beta version',
      type: 'boolean'
    }
  })
  .strict().argv;

let level;

const repo = `https://${process.env.GH_PAT}@github.com/${process.env.GITHUB_REPOSITORY}.git`;

function runClean() {
  execSync('yarn z-dev-clean-build');
}

function runCheck() {
  execSync('yarn lint');
}

function runTest() {
  execSync('yarn test');
}

function runBuild() {
  execSync('yarn build');
}

async function verBump() {
  const { rootPackage } = getPackagesSync(process.cwd());

  const result = await new Promise((resolve, reject) => {
    conventionalRecommendedBump(
      {
        config: {
          parserOpts,
          recommendedBumpOpts: { whatBump }
        }
      },
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      }
    );
  });

  console.log(result.reason);

  level = result.level;

  let releaseType;

  if (rootPackage.packageJson.version.includes('-')) {
    releaseType = 'prerelease';
  } else {
    releaseType = level === 0 ? 'major' : level === 1 ? 'minor' : 'patch';

    if (argv.beta) {
      releaseType = `pre${releaseType}`;
    }
  }

  execSync(`yarn z-dev-version ${releaseType}`);
}

async function gitPush() {
  const { rootPackage } = getPackagesSync(process.cwd());
  const version = rootPackage.packageJson.version;

  // if it is not beta, write changelog
  if (!version.includes('-')) {
    const stream = conventionalChangelog(
      {
        config: {
          parserOpts,
          writerOpts
        }
      },
      { version }
    );

    const content = (
      await new Promise((resolve, reject) => {
        stream.on('data', (data) => {
          console.log(data.toString());
          resolve(data.toString());
        });
        stream.on('error', reject);
      })
    ).replace(/\n+$/, '\n');

    const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');

    console.log('$ write changelog');
    console.log(content);

    fs.writeFileSync(
      'CHANGELOG.md',
      changelog.replace(
        '# CHANGELOG',
        `# CHANGELOG

${content}`
      )
    );
  }

  execSync('git add --all .');

  // add the skip checks for GitHub ...
  execSync(`git commit --no-status --quiet -m "chore: release/${version.includes('-') ? 'beta' : 'stable'} ${version}"`);

  execSync(`git push ${repo} HEAD:${process.env.GITHUB_REF}`, true);

  // if it is not beta, write changelog
  if (process.env.GH_RELEASE_GITHUB_API_TOKEN && !version.includes('-')) {
    const files = process.env.GH_RELEASE_FILES ? `--assets ${process.env.GH_RELEASE_FILES}` : '';

    execSync(`yarn z-exec-ghrelease ${files} --yes`);
  }
}

async function main() {
  // first do infrastructure setup
  gitSetup();

  await verBump();

  // perform the actual CI ops
  runClean();
  runCheck();
  runTest();
  runBuild();

  // publish to all GH repos
  await gitPush();
}

main();
