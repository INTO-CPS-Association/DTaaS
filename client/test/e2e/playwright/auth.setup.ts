/* eslint-disable no-param-reassign */
import { test as setup, expect } from '@playwright/test';
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
  // Accept the cookies if popup appears
  try {
    // Wait for 'Accept All Cookies' button to appear for up to 4 seconds.
    await page.waitForSelector('button:has-text("Accept All Cookies")', {
      timeout: 4000,
    });
    // If the button appears, click it.
    await page.getByRole('button', { name: 'Accept All Cookies' }).click();
  } catch (error) {
    // 'Accept All Cookies' button did not appear within 4 seconds, so just ignore and continue.
  }
  await page.fill('#user_login', testUsername.toString()); // Insert valid GitLab testing username.
  await page.fill('#user_password', testPassword.toString()); // Insert valid GitLab testing password.
  await page.getByRole('button', { name: 'Sign in' }).click();
  try {
    await page.waitForSelector('input[type="submit"][value="Authorize"]', {
      timeout: 10000,
    });
    await page.click('input[type="submit"][value="Authorize"]');
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
