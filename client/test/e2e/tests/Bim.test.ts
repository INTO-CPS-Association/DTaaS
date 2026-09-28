// src: https://playwright.dev/docs/writing-tests

import fs from 'node:fs';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';
import test from 'test/e2e/setup/fixtures';
import {
  openAuthenticatedApp,
  requireFullPlatform,
} from 'test/e2e/setup/appSettings';

/**
 * The Building Models route, end to end.
 *
 * A single page application answers HTTP 200 for every path, so reaching the
 * URL proves nothing. Each test below asserts on something only this page
 * renders.
 *
 * The drawing itself is checked only as far as a browser shows it: a canvas
 * appears and no error takes its place. A WebGL canvas has no accessible
 * content to query, so what the drawing contains is covered by the package's
 * own tests, which run without a browser.
 */
test.describe('Building Models', () => {
  test.beforeEach(async ({ page }) => {
    await openAuthenticatedApp(page);
    await expect(page).toHaveURL(/.*Library/);
  });

  test('Is reachable from the menu and renders its own heading', async ({
    page,
  }) => {
    // The menu names the route Buildings, and the page heads itself
    // Building Models.
    await page.getByRole('link', { name: 'Buildings' }).click();

    await expect(page).toHaveURL('./bim');
    await expect(
      page.getByRole('heading', { name: 'Building Models' }),
    ).toBeVisible();
  });

  test('Names the library directory it reads models from', async ({ page }) => {
    // The directory is named once the workspace has answered the listing.
    requireFullPlatform();
    // The address comes from the deployment's own configuration. A page that
    // did not say where it was looking would leave an empty list ambiguous
    // between "no models" and "wrong directory".
    await page.getByRole('link', { name: 'Buildings' }).click();

    await expect(page.getByText('common/models')).toBeVisible();
  });

  test('Says what it found instead of leaving the page blank', async ({
    page,
  }) => {
    // The list comes from the workspace, which only a deployment serves.
    requireFullPlatform();
    // Either outcome is correct and the page has to distinguish them: a
    // library with no IFC file says so, and a library with one offers the
    // models in a menu headed IFC Model and says how many there are.
    await page.getByRole('link', { name: 'Buildings' }).click();

    const empty = page.getByText('No IFC file is in the shared library yet.');
    const picker = page.getByRole('combobox', { name: 'IFC Model' });
    const count = page.getByText(/^\d+ IFC models? in the shared library\.$/);

    // The list comes from the workspace over the network, which takes longer
    // than the default five seconds on a busy run.
    await expect(empty.or(picker).first()).toBeVisible({ timeout: 30000 });
    if (await picker.isVisible()) {
      await expect(count).toBeVisible();
    }
  });
});

/** The model the drawing tests upload, convert and remove again. */
const FIXTURE = path.join(
  process.cwd(),
  'test/e2e/fixtures/wall-with-opening-and-window.ifc',
);

/**
 * Wait until the model is in the scene and nothing went wrong drawing it.
 *
 * A WebGL canvas has nothing to query, and counting its colours does not tell
 * an empty scene from a small model, grey on grey: with the model file held
 * back, an empty scene gave 261 and 410 colours, and a small model 285. The
 * class list under the drawing does tell them apart, because it is computed
 * from the objects the scene holds, so it appears only once the model is in.
 */
async function expectModelDrawn(page: Page) {
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30000 });
  const classes = page.getByText('In This Model').locator('..');
  await expect(classes).toBeVisible({ timeout: 30000 });
  await expect(classes.getByRole('button').first()).toBeVisible();
  await expect(page.getByText(/could not be read/)).toHaveCount(0);
}

/** Choose a model in the IFC Model menu by the name it is listed under. */
async function chooseModel(page: Page, title: string) {
  await page.getByRole('link', { name: 'Buildings' }).click();
  const picker = page.getByRole('combobox', { name: 'IFC Model' });
  // The list comes from the workspace over the network, which takes longer
  // than the default five seconds on a busy run.
  await expect(picker).toBeVisible({ timeout: 30000 });
  await picker.click();
  // Its own limit, so a model that is not listed fails this step with a
  // message that names it instead of running into the test's timeout.
  await page
    .getByRole('option')
    .filter({ hasText: title })
    .click({ timeout: 30000 });
}

test.describe('Building Models, Drawing a Model', () => {
  requireFullPlatform();

  test.beforeEach(async ({ page }) => {
    await openAuthenticatedApp(page);
    await expect(page).toHaveURL(/.*Library/);
  });

  test('Converts a model, stores it, and draws it again from what it stored', async ({
    page,
    baseURL,
  }, testInfo) => {
    // The waits below add up to about five minutes at worst: the list, the
    // conversion and the drawing, twice. The default of 90 seconds would stop
    // the test part way and leave the uploaded model behind.
    test.setTimeout(6 * 60 * 1000);
    // The test brings its own model under a name no other run uses, so it
    // does not depend on what the library holds and two browsers never race
    // for the same file. What it writes is removed at the end, unless the run
    // is stopped from outside.
    const stamp = Date.now();
    const stem = `e2e_${testInfo.project.name}_${stamp}`;
    // The menu names a model by the project name inside the file, so the copy
    // uploaded carries the same unique name there. The fixture on disk is not
    // changed, and the page's reading of that name is exercised on the way.
    const title = `E2E ${testInfo.project.name} ${stamp}`;
    const ifc = fs
      .readFileSync(FIXTURE, 'utf-8')
      .replace("'Default Project'", `'${title}'`);
    expect(ifc).toContain(title);
    const username = process.env.REACT_APP_TEST_USERNAME ?? '';
    expect(username, 'REACT_APP_TEST_USERNAME is set in test/.env').not.toBe(
      '',
    );
    const library = `${(baseURL ?? '').replace(/\/$/, '')}/${username}/api/contents/common/models`;
    const upload = await page.request.put(`${library}/${stem}.ifc`, {
      data: { type: 'file', format: 'text', content: ifc },
    });
    expect(upload.ok()).toBe(true);

    try {
      // First visit: no .glb beside the model, so the browser converts it and
      // stores the result. A refusal to store is reported at once.
      await chooseModel(page, title);
      const stored = page.getByText(/Stored in the library/);
      const refused = page.getByText(/could not be stored/);
      await expect(stored.or(refused)).toBeVisible({ timeout: 60000 });
      expect(
        await refused.isVisible(),
        'The page reported that the conversion could not be stored.',
      ).toBe(false);
      await expect(
        page.getByText('Converted', { exact: true }).first(),
      ).toBeVisible();
      await expectModelDrawn(page);

      // Second visit: the stored .glb is loaded instead of converting again.
      // Leaving for the Library and coming back mounts the page anew, so it
      // lists the folder again and finds the .glb the first visit stored.
      await page.getByRole('link', { name: 'Library' }).click();
      await expect(page).toHaveURL(/.*library/i);
      await chooseModel(page, title);
      await expect(
        page.getByText(/No converted geometry sits beside this model/),
      ).toHaveCount(0);
      await expectModelDrawn(page);
    } finally {
      await Promise.all(
        [`${stem}.ifc`, `${stem}.glb`, `${stem}.glb.part`].map((name) =>
          page.request.delete(`${library}/${name}`),
        ),
      );
    }
  });
});

test.describe('Building Models Without a Session', () => {
  test('Sends the visitor to sign in', async ({ page, baseURL }) => {
    // The route reads the signed-in user's own library, so it must not be
    // reachable without a session. The session lives in sessionStorage and is
    // restored only by openAuthenticatedApp, so a page opened directly has
    // none, the same way the authentication suite checks the other routes.
    await page.goto('./bim');

    await expect(page).toHaveURL(baseURL?.replace(/\/$/, '') ?? './');
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible({
      timeout: 10000,
    });
  });
});
