import { test, expect } from '@playwright/test';

test.describe('unauthenticated', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('homepage redirects unauthenticated users to login', async ({
    page,
  }) => {
    await page.goto('/');

    // Unauthenticated requests are redirected to /login by the proxy middleware.
    await expect(page).toHaveURL(/\/login/);

    // The login page displays its primary heading.
    await expect(page.locator('h1')).toContainText(
      'Sign in to manage your job search workspace.',
    );
  });
});

test.describe('authenticated', () => {
  test('homepage is accessible when logged in', async ({ page }) => {
    await page.goto('/');

    // Authenticated users see the main page content.
    await expect(page.locator('h1')).toContainText('Job Applicator');
  });

  test('toggle dark mode changes page theme', async ({ page }) => {
    await page.goto('/');

    const toggleButton = page.getByRole('button', {
      name: 'Toggle Dark Mode',
    });
    await expect(toggleButton).toBeVisible();

    // Start in light mode (no dark class on html).
    const html = page.locator('html');
    await expect(html).not.toHaveClass(/dark/);

    // Click to toggle dark mode on.
    await toggleButton.click();
    await expect(html).toHaveClass(/dark/);

    // Click again to toggle back to light mode.
    await toggleButton.click();
    await expect(html).not.toHaveClass(/dark/);
  });
});
