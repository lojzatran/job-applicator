import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  const testEmail = process.env.E2E_TEST_USER_EMAIL;
  const testPassword = process.env.E2E_TEST_USER_PASSWORD;

  if (!testEmail || !testPassword) {
    throw new Error(
      'E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD must be set. ' +
        'Ensure global-setup.ts ran successfully.',
    );
  }

  await page.goto('/login');
  await page.getByLabel('Email').fill(testEmail);
  await page.getByLabel('Password').fill(testPassword);
  await page
    .getByRole('button', { name: /sign in/i })
    .nth(1)
    .click();
  // eslint-disable-next-line playwright/no-standalone-expect
  await expect(page).toHaveURL('/');
  await page.context().storageState({ path: authFile });
});
