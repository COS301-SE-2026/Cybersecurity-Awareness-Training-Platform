import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: ['dist/**', 'coverage/**', 'node_modules/**'],
    env: {
      AUTH_RATE_LIMIT_MAX_REQUESTS: '5',
      TEST_DATABASE_URL:
        process.env.TEST_DATABASE_URL ||
        process.env.DATABASE_URL ||
        'postgresql://insightful_phish:insightful_phish@localhost:5432/insightful_phish_test',
      DATABASE_URL:
        process.env.DATABASE_URL ||
        process.env.TEST_DATABASE_URL ||
        'postgresql://insightful_phish:insightful_phish@localhost:5432/insightful_phish_test',
      AUTH_TOKEN_SECRET: 'this-is-a-non-demo-auth-secret-token',
    },
    coverage: {
      reporter: ['text', 'json', 'html', 'lcov', 'json-summary'],
    },
  },
});
