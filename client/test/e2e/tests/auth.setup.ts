/* eslint-disable no-param-reassign */
import { expect } from '@playwright/test';
import { test as setup } from '../setup/fixtures';

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
  try {
    await page.waitForSelector('label[for="user_login"]', { timeout: 10000 }); // wait up to 10 seconds
  } catch (error) {
    // The login page did not appear within 10 seconds, so just ignore and continue.
  }
  await page.fill('#user_login', testUsername.toString()); // Insert valid GitLab testing username.
  await page.fill('#user_password', testPassword.toString()); // Insert valid GitLab testing password.
  await page.locator('label').filter({ hasText: 'Remember me' }).click();
  await page.getByRole('button', { name: 'Sign in' }).click();
  try {
    await page.getByRole('button', { name: 'Authorize' }).click();
  } catch (error) {
    // 'Authorize' button did not appear within 4 seconds, so just ignore and continue.
  }
  await expect(
    page.getByRole('button', { name: 'Open settings' }),
  ).toBeVisible();

  const storage = await page.context().storageState();
  storage.cookies = storage.cookies.map((cookie) => {
    if (cookie.name === 'preferred_language') {
      cookie.httpOnly = false;
      cookie.secure = false;
      cookie.sameSite = 'Lax';
    } else if (
      cookie.name === 'known_sign_in' ||
      cookie.name === '_gitlab_session'
    ) {
      cookie.httpOnly = true;
      cookie.secure = false;
      cookie.sameSite = 'Lax';
    } else if (cookie.name === '_cfuvid') {
      cookie.httpOnly = true;
      cookie.secure = true;
      cookie.sameSite = 'None';
    }
    return cookie;
  });
  await page.context().addCookies(storage.cookies);
  await page.context().storageState({ path: authFile });
});
