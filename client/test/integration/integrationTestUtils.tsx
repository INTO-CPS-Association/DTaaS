import {
  cleanup,
  getDefaultNormalizer,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { useAuth } from 'react-oidc-context';
import { ITabs } from 'route/IData';
import store from 'store/store';
import { mockUser, mockUserType } from '../unitTests/__mocks__/global_mocks';
import { renderWithRouter } from '../unitTests/testUtils';

export async function testLayout() {
  testFooter();
  await testDrawer();
  await testToolbar();
}

export const normalizer = getDefaultNormalizer({
  trim: false,
  collapseWhitespace: false,
});

export function setupIntegrationTest(
  route?: string,
  user?: mockUserType,
  ui?: React.JSX.Element,
) {
  cleanup();
  (useAuth as jest.Mock).mockReturnValue({
    ...{ isAuthenticated: true },
    user: user ?? mockUser,
  });
  store.dispatch({
    type: 'auth/setUserName',
    payload: mockUser.profile.profile!.split('/')[1],
  });
  return renderWithRouter(ui ?? <></>, { route: route ?? '/private', store });
}

export function closestDiv(element: HTMLElement) {
  const div = element.closest('div');
  expect(div).toBeInTheDocument();
  return div!;
}

export async function testDrawer() {
  expect(screen.getByTestId(/ChevronLeftIcon/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Library/ })).toBeInTheDocument();
  expect(screen.getByTestId(/ExtensionIcon/)).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: /Digital Twins/ }),
  ).toBeInTheDocument();
  expect(screen.getByTestId(/PeopleIcon/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Workbench/ })).toBeInTheDocument();
  expect(screen.getByTestId(/EngineeringIcon/)).toBeInTheDocument();

  await itOpensAndClosesTheDrawer();
}

export async function testToolbar() {
  expect(screen.getByText(/The Digital Twin as a Service/)).toBeInTheDocument();
  await testToolbarButton('Open settings', 'A', undefined);
  await testToolbarButton(
    'https://github.com/INTO-CPS-Association/DTaaS',
    undefined,
    'GitHubIcon',
  );
  await testToolbarButton(
    'https://into-cps-association.github.io/DTaaS',
    undefined,
    'HelpOutlineIcon',
  );
  await itOpensAndClosesTheDropdownMenu();
}

async function testToolbarButton(
  labelText: string,
  name?: string,
  iconTestId?: string,
) {
  const button = screen.getByLabelText(labelText);
  expect(button).toBeInTheDocument();
  if (iconTestId) {
    expect(within(button).getByTestId(iconTestId)).toBeInTheDocument();
  }
  if (name) {
    expect(within(button).getByText('A')).toBeInTheDocument();
  }
  await itShowsTheTooltipWhenHoveringButton(labelText);
}

async function itOpensAndClosesTheDropdownMenu() {
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  const settingsButton = screen.getByLabelText('Open settings');

  // Focus the menu
  await userEvent.click(settingsButton);
  await waitFor(() => {
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: /Account/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: /Logout/ }),
    ).toBeInTheDocument();
  });

  // Unfocus the menu
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

export async function itShowsTheTooltipWhenHoveringButton(toolTipText: string) {
  const button = screen.getByLabelText(toolTipText);
  expect(
    screen.queryByRole('tooltip', { name: toolTipText }),
  ).not.toBeInTheDocument();
  await userEvent.hover(button);
  await waitFor(() => {
    expect(
      screen.getByRole('tooltip', { name: toolTipText }),
    ).toBeInTheDocument();
  });

  await userEvent.unhover(button);
  await waitFor(() => {
    expect(
      screen.queryByRole('tooltip', { name: toolTipText }),
    ).not.toBeInTheDocument();
  });
}

async function itOpensAndClosesTheDrawer() {
  // Drawer is collapsed
  const drawerInnerDiv = closestDiv(
    screen.getByRole('link', { name: /Library/ }),
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
  const firstFooterParagraph = screen.getByText(/Copyright ©/);
  expect(firstFooterParagraph).toBeInTheDocument();
  const firstFooterLink = within(firstFooterParagraph).getByRole('link', {
    name: /The INTO-CPS Association/,
  });
  expect(firstFooterLink).toBeInTheDocument();
  expect(firstFooterLink).toHaveAttribute('href', 'https://into-cps.org/');
  const footerLinkClasses =
    'MuiTypography-root MuiTypography-inherit MuiLink-root MuiLink-underlineAlways';
  expect(firstFooterLink).toHaveClass(footerLinkClasses);
  const footerDiv = closestDiv(firstFooterParagraph);
  const secondFooterParagraph = within(footerDiv).getByText(
    /Thanks to Material-UI for the/,
  );
  expect(secondFooterParagraph).toBeInTheDocument();
  const secondFooterLink = within(secondFooterParagraph).getByRole('link', {
    name: /Dashboard template/,
  });
  expect(secondFooterLink).toBeInTheDocument();
  expect(secondFooterLink).toHaveAttribute(
    'href',
    'https://github.com/mui/material-ui/tree/v5.11.9/docs/data/material/getting-started/templates/dashboard',
  );
  expect(secondFooterLink).toHaveClass(footerLinkClasses);
}

/* eslint-disable no-await-in-loop */
export async function itShowsTheParagraphOfToTheSelectedTab(
  tablistsData: ITabs[][],
) {
  for (
    let tablistsIndex = 0;
    tablistsIndex < tablistsData.length;
    tablistsIndex += 1
  ) {
    const tablistData = tablistsData[tablistsIndex];
    for (let tabIndex = 0; tabIndex < tablistData.length; tabIndex += 1) {
      const tabData = tablistData[tabIndex];
      const isFirstTab = tabIndex === 0;
      const tab = screen.getByRole('tab', {
        name: tabData.label,
        selected: isFirstTab,
      });
      expect(tab).toBeInTheDocument();

      await userEvent.click(tab);

      const tabParagraph = screen.getByText(tabData.body, {
        normalizer,
      });
      expect(tabParagraph).toBeInTheDocument();
    }
  }
}
/* eslint-enable no-await-in-loop */
