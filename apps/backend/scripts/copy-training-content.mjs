import { mkdir, cp, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const sourceDir = path.resolve('src/content/training');
const targetDir = path.resolve('dist/src/content/training');

async function ensureSourceExists() {
  try {
    await access(sourceDir, constants.R_OK);
  } catch (error) {
    throw new Error(`Training content source directory not found: ${sourceDir}`, { cause: error });
  }
}

async function copyTrainingContent() {
  await ensureSourceExists();
  await mkdir(targetDir, { recursive: true });
  await cp(sourceDir, targetDir, { recursive: true });
}

await copyTrainingContent();
