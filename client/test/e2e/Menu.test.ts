// src: https://playwright.dev/docs/writing-tests

import { test, expect } from '@playwright/test';

interface TestLink {
  text: string;
  url: string;
}
const links: TestLink[] = [
  { text: 'Dashboard', url: '/dashboard' },
  { text: 'Library', url: '/library' },
  { text: 'Digital Twins', url: '/digitaltwins' },
  { text: 'Scenario Analysis', url: '/sanalysis' },
  { text: 'History', url: '/history' },
];

test.describe('Header Contents and Navigation Links', () => {
  links.forEach((link) => {
    test(`Navigation to ${link.text} link on the dashboard page`, async ({
      page,
    }) => {
      await page.goto(`${link.url}`);
      await expect(page).toHaveURL(link.url);
    });
  });
});

test.describe('Navigation from each link to other links', () => {
  test.afterAll(async ({ browser, context }) => {
    await context.close();
    await browser.close();
  });

  links.forEach((link) => {
    test.describe(`Navigation from ${link.text} to menu links`, () => {
      const linksToBeTested = links.filter((linkToTest) => linkToTest !== link);

      linksToBeTested.forEach((linkToTest) => {
        test(`Navigation from ${link.text} to ${linkToTest.text}`, async ({
          page,
        }) => {
          await page.goto(`${link.url}`);

          await page
            .locator(`div[role="button"]:has-text("${linkToTest.text}")`)
            .click();

          await expect(page).toHaveURL(linkToTest.url);
        });
      });
    });
  });
});
