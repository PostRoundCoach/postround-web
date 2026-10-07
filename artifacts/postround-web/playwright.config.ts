import { defineConfig, devices } from '@playwright/test'

const fixtureUrl = 'http://127.0.0.1:54321'
// Next normalizes a loopback-bound standalone server's redirect host to localhost.
const appUrl = 'http://localhost:3100'

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
      use: {
        ...devices['Desktop Chrome'],
        // Use Chromium's current headless mode, not the legacy headless shell:
        // the latter can stall animation-frame based actionability on this runner.
        channel: process.env.PLAYWRIGHT_CHROMIUM_PATH ? undefined : 'chromium',
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
          : undefined,
      },
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
        NEXT_PUBLIC_POSTROUND_API_BASE_URL: fixtureUrl,
        NEXT_PUBLIC_POSTROUND_ALLOW_LOCAL_API: 'true',
        // Never inherit a real listing in the default pending-listing fixture.
        ANDROID_STORE_URL: process.env.E2E_ANDROID_STORE_URL ?? '',
      },
      // A cold isolated production build can exceed five minutes on a busy runner.
      // Focused fixture-only reruns can explicitly reuse a validated completed build.
      timeout: 600_000,
    },
  ],
})