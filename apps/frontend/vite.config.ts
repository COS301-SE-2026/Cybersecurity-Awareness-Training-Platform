import { codecovVitePlugin } from '@codecov/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import flowbiteReact from 'flowbite-react/plugin/vite';
import { configDefaults, defineConfig } from 'vitest/config';

const codecovToken = process.env.CODECOV_TOKEN;
const isVitest = process.env.VITEST === 'true';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(isVitest ? [] : [flowbiteReact()]),
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
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
    coverage: {
      reporter: ['text', 'json', 'html', 'lcov', 'json-summary'],
    },
  },
});
