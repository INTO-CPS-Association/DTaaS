import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupIntegrationTest } from 'test/integration/integration.testUtil';
import { mockAuthState } from 'test/__mocks__/global_mocks';
import { routesFor } from 'routes';
import runWithProfile from 'test/profile.testUtil';

/**
 * The website as a workspace installation runs it, with
 * `REACT_APP_PROFILE: 'workbench'` in `env.js`. The drawer, the settings menu
 * and the private route read the profile when they render, and the routes
 * are built for it here, as `routes` builds them when the bundle loads.
 */
const HIDDEN_DRAWER_ENTRIES = [
  'Library',
  'Digital Twins',
  'Automation',
  'Buildings',
  'Insights',
];

const openWorkbenchProfile = (path: string) =>
  setupIntegrationTest(path, mockAuthState, routesFor('workbench'));

describe('Workbench profile', () => {
  runWithProfile('workbench');

  it('opens the Workbench with only its own drawer entry', async () => {
    await openWorkbenchProfile('/workbench');

    expect(
      screen.getByRole('heading', { level: 1, name: /Workbench Tools/ }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: /^Workbench$/ })).toHaveAttribute(
      'href',
      '/workbench',
    );
    HIDDEN_DRAWER_ENTRIES.forEach((name) => {
      expect(
        screen.queryByRole('link', { name: new RegExp(`^${name}$`) }),
      ).not.toBeInTheDocument();
    });
  });

  it('offers Logout but not Account in the settings menu', async () => {
    await openWorkbenchProfile('/workbench');

    await userEvent.click(
      screen.getByLabelText('Open settings', { selector: 'button' }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole('menuitem', { name: /Logout/ }),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('menuitem', { name: /Account/ }),
    ).not.toBeInTheDocument();
  });

  it.each([
    '/library',
    '/digitaltwins',
    '/automation',
    '/insights',
    '/account',
  ])('shows the page-not-found message at %s', async (path) => {
    await openWorkbenchProfile(path);

    expect(
      screen.getByRole('heading', { name: /This Page Does Not Exist/i }),
    ).toBeVisible();
  });
});
