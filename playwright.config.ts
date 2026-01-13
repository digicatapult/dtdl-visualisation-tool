import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  globalSetup: './test/globalSetup.ts',
  globalTeardown: './test/globalTeardown.ts',
  testDir: './test/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  workers: process.env.CI ? undefined : 2,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { open: 'never' }],
    ['playwright-ctrf-json-reporter', { outputDir: './playwright-report' }],
    ['list', {}],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    headless: !!process.env.CI,
  },
  expect: {
    timeout: 10 * 1000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testIgnore: '**/github.spec.ts',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testIgnore: '**/github.spec.ts',
      use: { ...devices['Desktop Safari'] },
    },
  ],
})
