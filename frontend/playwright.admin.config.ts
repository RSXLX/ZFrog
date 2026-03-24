import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/admin-v3-dashboard-smoke.e2e.ts',
  timeout: 45_000,
  expect: {
    timeout: 5_000,
  },
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4174',
    headless: true,
  },
  webServer: {
    command: 'npm --prefix ../admin run dev -- --host 127.0.0.1 --port 4174',
    port: 4174,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
