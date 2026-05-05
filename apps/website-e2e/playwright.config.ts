import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

// For CI, you may want to set BASE_URL to the deployed application.
const baseURL = process.env['BASE_URL'] || 'http://localhost:3000';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './e2e' }),
  globalSetup: './src/global-setup.ts',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npx nx dev website',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    cwd: workspaceRoot,
    gracefulShutdown: {
      signal: 'SIGTERM',
      timeout: 5000,
    },
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'Google Chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        headless: true,
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
      teardown: 'teardown',
    },
    {
      name: 'teardown',
      testMatch: /auth\.teardown\.ts/,
      use: {
        storageState: 'playwright/.auth/user.json',
      },
    },
  ],
});
