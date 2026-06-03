import { codecovVitePlugin } from '@codecov/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const codecovToken = process.env.CODECOV_TOKEN;

export default defineConfig({
  plugins: [
    react(),
    codecovVitePlugin({
      enableBundleAnalysis: codecovToken !== undefined,
      bundleName: 'insightful-phish-frontend',
      uploadToken: codecovToken,
      gitService: 'github',
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/testing/setupTests.ts'],
    coverage: {
      reporter: ['text', 'json', 'html', 'lcov', 'json-summary'],
    },
  },
});
