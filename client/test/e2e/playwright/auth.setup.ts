import { test as setup, expect } from '@playwright/test';
// import { getTestUsername, getTestPassword } from '../../testUtil';
import * as dotenv from 'dotenv';

dotenv.config({ path: './test/.env' });

const authFile = 'playwright/.auth/user.json';
const testUsername = process.env.REACT_APP_TEST_USERNAME ?? '';
const testPassword = process.env.REACT_APP_TEST_PASSWORD ?? '';

setup('authenticate', async ({ page }) => {
  // Perform authentication steps for authentication process.
  await page.goto('./');
  await page
    .getByRole('button', { name: 'GitLab logo Sign In with GitLab' })
    .click();
  await page.getByRole('button', { name: 'Accept All Cookies' }).click();
  await page.fill('#user_login', testUsername.toString()); // Insert valid GitLab testing username.
  await page.fill('#user_password', testPassword.toString()); // Insert valid GitLab testing password.
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(
    page.getByRole('button', { name: 'Open settings' })
  ).toBeVisible();

  // Stores the authentication session for playwright tests.
  await page.context().storageState({ path: authFile });
});
