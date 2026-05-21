import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: ['dist/**', 'coverage/**', 'node_modules/**'],
    coverage: {
      reporter: ['text', 'json', 'html', 'lcov', 'json-summary'],
    },
  },
});
