import { defineConfig, devices } from '@playwright/test'

const fixtureUrl = 'http://127.0.0.1:54321'
const appUrl = 'http://127.0.0.1:3100'

export default defineConfig({
  testDir: './e2e',
  // Next's development compiler is intentionally exercised, so keep fixture
  // sessions serial to avoid first-compile navigation races.
  workers: 1,
  retries: 0,
  reporter: 'line',
  use: {
    baseURL: appUrl,
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'node e2e/fake-supabase.mjs',
      cwd: __dirname,
      port: 54321,
      reuseExistingServer: false,
    },
    {
      command: 'sh e2e/start-app.sh',
      cwd: __dirname,
      port: 3100,
      reuseExistingServer: false,
      env: {
        PORT: '3100',
        NEXT_DIST_DIR: '.next-e2e',
        NEXT_PUBLIC_SUPABASE_URL: fixtureUrl,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'e2e-anon-key',
      },
      timeout: 180_000,
    },
  ],
})