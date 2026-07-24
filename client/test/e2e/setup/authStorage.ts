import fs from 'node:fs';
import { type Page } from '@playwright/test';

const AUTH_SESSION_FILE = 'playwright/.auth/session.json';

type SessionStorageState = Record<string, string>;

export async function saveSessionStorage(page: Page) {
  const storage = await page.evaluate<SessionStorageState>(() =>
    Object.fromEntries(Object.entries(sessionStorage)),
  );
  fs.writeFileSync(AUTH_SESSION_FILE, JSON.stringify(storage, null, 2));
}

export async function restoreSessionStorage(page: Page) {
  const storage = JSON.parse(
    fs.readFileSync(AUTH_SESSION_FILE, 'utf-8'),
  ) as SessionStorageState;
  await page.addInitScript((state: SessionStorageState) => {
    Object.entries(state).forEach(([key, value]) => {
      sessionStorage.setItem(key, value);
    });
  }, storage);
}
