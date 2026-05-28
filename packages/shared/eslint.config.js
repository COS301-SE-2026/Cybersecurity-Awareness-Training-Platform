// @ts-check

import { defineConfig } from 'eslint/config';
import { baseTypeScriptEslintConfig } from '../../eslint.config.base.js';

export default defineConfig(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'generated/**'],
  },
  ...baseTypeScriptEslintConfig,
);
