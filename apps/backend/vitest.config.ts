import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: ['dist/**', 'coverage/**', 'node_modules/**'],
    env: {
      TEST_DATABASE_URL:
        process.env.TEST_DATABASE_URL ||
        process.env.DATABASE_URL ||
        'postgresql://insightful_phish:insightful_phish@localhost:5432/insightful_phish_test',
      DATABASE_URL:
        process.env.DATABASE_URL ||
        process.env.TEST_DATABASE_URL ||
        'postgresql://insightful_phish:insightful_phish@localhost:5432/insightful_phish_test',
    },
    coverage: {
      reporter: ['text', 'json', 'html', 'lcov', 'json-summary'],
    },
  },
});
