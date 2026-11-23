import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:4173', headless: true },
  webServer: {
    command: 'pnpm preview --host 127.0.0.1 --strictPort',
    cwd: process.cwd(),
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: false,
  },
});
