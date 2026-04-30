#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const writeMode = process.argv.includes('--write');
const dashRegex = /[\u2013\u2014\u2212]/g;

const allowedExtensions = new Set([
  '.md',
  '.txt',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.cjs',
  '.mjs',
  '.json',
  '.jsonc',
  '.yml',
  '.yaml',
  '.css',
  '.html',
  '.sh',
  '.prisma',
]);

const allowedExactFiles = new Set(['.env.example']);

const ignoredPrefixes = [
  'node_modules/',
  'dist/',
  'build/',
  'coverage/',
  '.git/',
  '.husky/_/',
  '.playwright/',
  'playwright-report/',
  'test-results/',
  'apps/backend/src/generated/',
  'apps/backend/prisma/migrations/',
  'Images/',
];

const ignoredExactFiles = new Set(['pnpm-lock.yaml', '.DS_Store']);

function getExtension(filePath) {
  const match = filePath.match(/(\.[a-zA-Z0-9]+)$/);
  return match ? match[1] : '';
}

function shouldCheck(filePath) {
  if (!existsSync(filePath)) return false;
  if (ignoredExactFiles.has(filePath)) return false;
  if (ignoredPrefixes.some((prefix) => filePath.startsWith(prefix))) return false;
  if (allowedExactFiles.has(filePath)) return true;

  return allowedExtensions.has(getExtension(filePath));
}

function getTrackedFiles() {
  return execSync('git ls-files', { encoding: 'utf8' })
    .split('\n')
    .map((file) => file.trim())
    .filter(Boolean)
    .filter(shouldCheck);
}

const filesWithLongDashes = [];

for (const file of getTrackedFiles()) {
  const original = readFileSync(file, 'utf8');
  const updated = original.replace(dashRegex, '-');

  if (original !== updated) {
    filesWithLongDashes.push(file);

    if (writeMode) {
      writeFileSync(file, updated, 'utf8');
    }
  }
}

if (filesWithLongDashes.length > 0) {
  if (writeMode) {
    console.log('Replaced long dash characters with normal hyphens in:');
  } else {
    console.error('Long dash characters found. Replace them with normal hyphens (-):');
  }

  for (const file of filesWithLongDashes) {
    console.error(`  - ${file}`);
  }

  if (!writeMode) {
    console.error('');
    console.error('Run: pnpm dashes:fix');
    process.exit(1);
  }
}
