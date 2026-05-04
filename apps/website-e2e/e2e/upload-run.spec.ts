import { test, expect } from '@playwright/test';
import { join } from 'node:path';

const dummyResumePath = join(__dirname, '../fixtures/cv-js.pdf');

test('upload resume, enable StartupJobs, set 5 max jobs, and trigger run', async ({
  page,
}) => {
  await page.goto('/');

  // Upload a dummy resume via the hidden file input.
  await page.locator('input[type="file"]').setInputFiles(dummyResumePath);

  // Wait for the file to be attached and the UI to update.
  await expect(page.getByText('Attached')).toBeVisible();

  // Enable StartupJobs toggle.
  await page.locator('#startupjobs-toggle').click();
  await expect(page.locator('#startupjobs-toggle')).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  // Set max jobs to 5.
  const maxJobsInput = page.locator('#max-jobs');
  await maxJobsInput.fill('5');
  await expect(maxJobsInput).toHaveValue('5');

  // Submit the form and wait for the upload API response.
  const uploadResponsePromise = page.waitForResponse('/api/upload');
  await page.getByRole('button', { name: /prepare application pack/i }).click();
  const uploadResponse = await uploadResponsePromise;
  expect(uploadResponse.status()).toBe(200);

  // Assert the processing state appears after successful upload.
  await expect(
    page.getByRole('heading', { name: 'Applying AI Magic' }),
  ).toBeVisible();
});
