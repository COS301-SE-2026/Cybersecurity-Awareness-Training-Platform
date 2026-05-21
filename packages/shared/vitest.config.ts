import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['dist/**', 'coverage/**', 'node_modules/**'],
    coverage: {
      reporter: ['text', 'json', 'html', 'lcov', 'json-summary'],
    },
  },
});
