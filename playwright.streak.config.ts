import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'streak-classifier.spec.ts',
  fullyParallel: true,
  reporter: 'list',
});
