import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://localhost:8082';
const localSupabaseUrl = process.env.E2E_SUPABASE_URL ?? 'http://127.0.0.1:55321';
const localSupabaseAnonKey =
  process.env.E2E_SUPABASE_ANON_KEY ?? 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run web -- --port 8082 --clear',
    url: baseURL,
    env: {
      ...process.env,
      EXPO_PUBLIC_SUPABASE_URL: localSupabaseUrl,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: localSupabaseAnonKey,
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
