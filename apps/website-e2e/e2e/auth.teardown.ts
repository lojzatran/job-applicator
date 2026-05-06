import { test as teardown, expect } from '@playwright/test';

teardown('logout', async ({ page }) => {
  await page.goto('/');

  // Confirm we are on the authenticated homepage.
  // eslint-disable-next-line playwright/no-standalone-expect
  await expect(page.locator('h1')).toContainText('Job Applicator');

  // Click the Sign out button.
  await page.getByRole('button', { name: 'Sign out' }).click();

  // We should be redirected to the login page.
  // eslint-disable-next-line playwright/no-standalone-expect
  await expect(page).toHaveURL(/\/login/);
  // eslint-disable-next-line playwright/no-standalone-expect
  await expect(page.locator('h1')).toContainText(
    'Sign in to manage your job search workspace.',
  );
});
