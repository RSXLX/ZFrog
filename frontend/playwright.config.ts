import { defineConfig } from '@playwright/test';

const v3SmokeEnv = {
  VITE_V3_COUNCIL_BETA_ENABLED: process.env.VITE_V3_COUNCIL_BETA_ENABLED ?? 'true',
  VITE_V3_CREATOR_BETA_ENABLED: process.env.VITE_V3_CREATOR_BETA_ENABLED ?? 'true',
  VITE_V3_MEMORY_WORLD_BETA_ENABLED: process.env.VITE_V3_MEMORY_WORLD_BETA_ENABLED ?? 'true',
  VITE_V3_MEMORY_WORLD_OWNER_ENABLED: process.env.VITE_V3_MEMORY_WORLD_OWNER_ENABLED ?? 'true',
  VITE_V3_INTEGRATION_API_KEY: process.env.VITE_V3_INTEGRATION_API_KEY ?? 'test-key',
};

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 30_000,
  expect: {
    timeout: 15_000,
  },
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    env: {
      ...process.env,
      ...v3SmokeEnv,
    },
    port: 4173,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
