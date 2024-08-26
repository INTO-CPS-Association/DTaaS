import { expect } from '@playwright/test';
import test from 'test/e2e/setup/fixtures';

test('Website loads', async ({ page }) => {
  await page.goto('./');
  const loginElement = await page.getByRole('button', {
    name: 'GitLab logo Sign In with GitLab',
  });
  await expect(loginElement).toBeVisible();
});