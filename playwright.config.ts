import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  fullyParallel: true,

  workers: 6, // my CPU works with this

  use: {
    headless: true, // faster
    trace: 'on-first-retry', // debug failures
    baseURL: 'http://localhost:3000', // adjust if needed
  },
});