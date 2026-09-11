import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  closestDiv,
  itShowsTheTooltipWhenHoveringButton,
} from 'test/integration/integration.testUtil';

export async function testLayout() {
  testFooter();
  await testDrawer();
  await testToolbar();
  await testSettingsButton();
}

export async function testPublicLayout() {
  testFooter();
  await testToolbar();
}

/**
 * Each navigation item carries its own icon, so the icon is looked for inside
 * the item and not in the whole document. A destination and the card that
 * links to it share an icon on purpose, and a search across the page would
 * find both.
 */
function testDrawerItem(name: RegExp, iconTestId: RegExp) {
  const item = screen.getByRole('link', { name });
  expect(item).toBeInTheDocument();
  expect(within(item).getByTestId(iconTestId)).toBeInTheDocument();
}

export async function testDrawer() {
  expect(screen.getByTestId(/ChevronLeftIcon/)).toBeInTheDocument();
  testDrawerItem(/^Library$/, /ExtensionRoundedIcon/);
  testDrawerItem(/^Digital Twins$/, /PeopleRoundedIcon/);
  testDrawerItem(/Workbench/, /HandymanRoundedIcon/);

  await itOpensAndClosesTheDrawer();
}

export async function testToolbar() {
  expect(
    screen.getByText(/DTaaS - Digital Twin as a Service/),
  ).toBeInTheDocument();
  await testToolbarButton(
    'https://github.com/INTO-CPS-Association/DTaaS',
    'GitHubIcon',
  );
  await testToolbarButton(
    'https://into-cps-association.github.io/DTaaS',
    'HelpOutlinedIcon',
  );
}

async function testToolbarButton(labelText: string, iconTestId: string) {
  const button = screen.getByLabelText(labelText);
  expect(button).toBeInTheDocument();
  expect(within(button).getByTestId(iconTestId)).toBeInTheDocument();
  await itShowsTheTooltipWhenHoveringButton(labelText);
}

async function testSettingsButton() {
  // Button exists
  const labelText = 'Open settings';
  const settingsButton = screen.getByLabelText(labelText, {
    selector: 'button',
  });
  expect(settingsButton).toBeInTheDocument();

  // The avatar carries a letter and no image, so nothing is fetched from the
  // identity provider on every page.
  expect(within(settingsButton).getByText('A')).toBeInTheDocument();

  // Has visible tooltip
  await itShowsTheTooltipWhenHoveringButton(labelText);

  // Can open and close
  await itOpensAndClosesTheSettingsMenu();
}

async function itOpensAndClosesTheSettingsMenu() {
  // Opens and shows contents
  await userEvent.click(
    screen.getByLabelText('Open settings', {
      selector: 'button',
    }),
  );
  await waitFor(() => {
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: /Account/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: /Logout/ }),
    ).toBeInTheDocument();
  });

  // Closes and hides contents
  await userEvent.tab();
  await waitFor(() => {
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: /Account/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: /Logout/ }),
    ).not.toBeInTheDocument();
  });
}

async function itOpensAndClosesTheDrawer() {
  // Drawer is collapsed
  const drawerInnerDiv = closestDiv(
    screen.getByRole('link', { name: /^Library$/ }),
  );
  expect(drawerInnerDiv).toHaveStyle('width:calc(56px + 1px);');
  // Open-drawer-button is visible
  const menuButton = screen.getByLabelText(/Open drawer/i);
  expect(menuButton).toBeVisible();

  // Open the drawer
  await userEvent.click(menuButton);

  // Drawer is expanded, Open-drawer-button is hidden
  expect(drawerInnerDiv).toHaveStyle('width:240px');
  expect(menuButton).not.toBeVisible();

  // Close the drawer
  const chevronLeftButton = screen
    .getByTestId(/ChevronLeftIcon/)
    .closest('button');
  expect(chevronLeftButton).toBeInTheDocument();
  await userEvent.click(chevronLeftButton!);

  // Drawer is collapsed, Open-drawer-button is visible again
  expect(drawerInnerDiv).toHaveStyle('width:calc(56px + 1px);');
  expect(menuButton).toBeVisible();
}

export function testFooter() {
  // What the footer has to carry: the copyright, a working link to the
  // Association, and the grouped links. The assertions below name content and
  // roles and not MUI class names, because a class name changes whenever
  // the theme does and says nothing about whether the footer works.
  const copyright = screen.getByText(/Copyright ©/);
  expect(copyright).toBeInTheDocument();

  const associationLink = within(copyright).getByRole('link', {
    name: /The INTO-CPS Association/,
  });
  expect(associationLink).toBeInTheDocument();
  expect(associationLink).toHaveAttribute('href', 'https://into-cps.org/');

  const footer = screen.getByRole('contentinfo');
  expect(footer).toBeInTheDocument();

  const documentation = within(footer).getByRole('link', {
    name: /Documentation/,
  });
  expect(documentation).toHaveAttribute(
    'href',
    'https://into-cps-association.github.io/DTaaS',
  );

  // Every external link opens in a new tab, and the rel value is what stops
  // the opened page reaching back through window.opener.
  within(footer)
    .getAllByRole('link')
    .forEach((link) => {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link.getAttribute('rel')).toContain('noreferrer');
    });

  // The acknowledgement of the Material-UI Dashboard template moved into the
  // source of page/Footer.tsx. MUI is MIT licensed, which is satisfied by the
  // licence text shipping with the dependency, so no visible credit is due.
  expect(screen.queryByText(/Thanks to Material-UI for the/)).toBeNull();
}
