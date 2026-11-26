import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/extension',
  timeout: 30000,
  workers: 1, // Extensions must run single-worker to avoid context collisions
  reporter: 'list',
  use: {
    headless: false,
    trace: 'on-first-retry',
  },
});
