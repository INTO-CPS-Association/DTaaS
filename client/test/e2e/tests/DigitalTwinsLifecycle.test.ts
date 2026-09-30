import { expect, type Locator, type Page } from '@playwright/test';
import test from 'test/e2e/setup/fixtures';
import { openAuthenticatedApp } from 'test/e2e/setup/appSettings';

/**
 * A digital twin from creation to deletion, through the Create and Manage tabs
 * of the Digital Twins Page.
 *
 * Every step writes to the signed-in user's GitLab project, so the twin gets a
 * name no other run uses and is deleted at the end, also when a step fails. A
 * run stopped from outside, by the global timeout or by hand, skips that
 * clean-up, and test/README.md says the twin is then safe to delete by hand.
 * The file name matches the sequential projects of playwright.config.ts, which
 * is where the tests that change the shared GitLab project run.
 */

/**
 * Write text into the file open in the editor, replacing what it held.
 *
 * The editor keeps its text field out of sight and draws the text itself, so
 * the click goes to the drawn lines and the keys to whatever has focus.
 */
async function writeInEditor(page: Page, scope: Locator, text: string) {
  await scope.locator('.monaco-editor .view-lines').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(text);
}

/**
 * The card of a twin on the Manage tab, found through the search field.
 *
 * The field searches the name the twin was created with, and the card is
 * headed by the title the page makes of it.
 */
async function manageCard(page: Page, name: string, title: string) {
  await page.getByRole('tab', { name: 'Manage' }).click();
  const manage = page.getByRole('tabpanel', { name: 'Manage' });
  await manage.getByRole('textbox', { name: 'Search by name' }).fill(name);
  return manage
    .locator('.MuiPaper-root')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) });
}

async function deleteTwin(page: Page, name: string, title: string) {
  const card = await manageCard(page, name, title);
  await card.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Yes' }).click();
  await expect(page.getByText(/deleted successfully/)).toBeVisible({
    timeout: 30000,
  });
}

test.describe('Digital Twin Lifecycle', () => {
  test('Creates a twin, reconfigures it, and deletes it', async ({
    page,
  }, testInfo) => {
    // Creation, reconfiguration and deletion each wait on GitLab, about four
    // minutes in all at worst. The default of 90 seconds would stop the test
    // part way and leave the twin in the shared project.
    test.setTimeout(6 * 60 * 1000);

    // The page titles a twin by its name with dashes read as spaces and each
    // word capitalised, so e2e-chromium-sequential-1 is listed as
    // E2e Chromium Sequential 1.
    const stamp = Date.now();
    const name = `e2e-${testInfo.project.name}-${stamp}`;
    const title = name
      .split('-')
      .map((word) => word.replace(/^./, (c) => c.toUpperCase()))
      .join(' ');
    const marker = `Reconfigured by the end-to-end suite ${stamp}`;

    await openAuthenticatedApp(page, './preview/digitaltwins');
    await page.getByRole('tab', { name: 'Create' }).click();
    const create = page.getByRole('tabpanel', { name: 'Create' });

    let created = false;
    try {
      // Save stays disabled until the twin has a name.
      await expect(create.getByRole('button', { name: 'Save' })).toBeDisabled();
      await create
        .getByRole('textbox', { name: 'Digital Twin Name' })
        .fill(name);

      // The three files every twin starts with are refused while empty.
      await create.getByRole('treeitem', { name: 'Description' }).click();
      await create.getByRole('treeitem', { name: 'Configuration' }).click();
      const files: Array<[string, string]> = [
        ['description.md', `A twin created by the end-to-end suite.`],
        ['README.md', `# ${title}`],
        ['.gitlab-ci.yml', 'image: alpine'],
      ];
      for (const [file, content] of files) {
        await create.getByRole('treeitem', { name: file }).click(); // eslint-disable-line no-await-in-loop
        await writeInEditor(page, create, content); // eslint-disable-line no-await-in-loop
      }

      await create.getByRole('button', { name: 'Save' }).click();
      const confirm = page.getByRole('dialog');
      await expect(confirm).toContainText(name);
      await confirm.getByRole('button', { name: 'Confirm' }).click();
      await expect(
        page.getByText(`Digital twin ${name} created successfully`),
      ).toBeVisible({ timeout: 60000 });
      created = true;

      // Manage lists it.
      const card = await manageCard(page, name, title);
      await expect(card).toHaveCount(1, { timeout: 30000 });

      // Reconfigure: change the description and apply the change. The card
      // shows the description, so the change is visible there at once.
      const openFile = async (file: string) => {
        await card.getByRole('button', { name: 'Reconfigure' }).click();
        const dialog = page.getByRole('dialog', {
          name: `Reconfigure ${title}`,
        });
        await dialog.getByRole('treeitem', { name: 'Description' }).click();
        await dialog.getByRole('treeitem', { name: file }).click();
        return dialog;
      };
      const dialog = await openFile('description.md');
      await writeInEditor(page, dialog, marker);
      await dialog.getByRole('button', { name: 'Save' }).click();
      await page
        .getByRole('dialog')
        .filter({ hasText: 'Are you sure you want to apply the changes?' })
        .getByRole('button', { name: 'Yes' })
        .click();
      await expect(
        page.getByText(`${title} reconfigured successfully`),
      ).toBeVisible({ timeout: 60000 });
      await expect(card).toContainText(marker);

      // Opened again, the file is read back from GitLab with the change in it.
      // Leaving without saving asks first.
      const reopened = await openFile('description.md');
      await expect(reopened.locator('.monaco-editor')).toContainText(marker, {
        timeout: 30000,
      });
      await reopened.getByRole('button', { name: 'Cancel' }).click();
      await page
        .getByRole('dialog')
        .filter({ hasText: 'Are you sure you want to cancel?' })
        .getByRole('button', { name: 'Yes' })
        .click();
      await expect(page.getByRole('dialog')).toHaveCount(0);

      // Details opens on the twin and closes again.
      await card.getByRole('button', { name: 'Details' }).click();
      const details = page.getByRole('dialog');
      await expect(details.getByRole('heading', { name: title })).toBeVisible();
      await details.getByRole('button', { name: 'Close' }).click();
      await expect(details).toHaveCount(0);

      // Delete, and the card is gone.
      await deleteTwin(page, name, title);
      created = false;
      await expect(await manageCard(page, name, title)).toHaveCount(0);
    } finally {
      // A twin left behind by a failed step is removed as well, from a page of
      // its own so a dialog the failure left open cannot stand in the way.
      if (created) {
        const cleanup = await page.context().newPage();
        await openAuthenticatedApp(cleanup, './preview/digitaltwins');
        await deleteTwin(cleanup, name, title);
        await cleanup.close();
      }
    }
  });
});
