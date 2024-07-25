import {
  cleanup,
  getDefaultNormalizer,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { useAuth } from 'react-oidc-context';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { ITabs } from 'route/IData';
import store from 'store/store';
import { userMock } from '../unitTests/__mocks__/global_mocks';

export async function testLayout() {
  testFooter();
  await testDrawer();
  await testToolbar();
}

export const normalizer = getDefaultNormalizer({
  trim: false,
  collapseWhitespace: false,
});

function renderWithMemoryRouter(ui: React.JSX.Element) {
  return render(
    <Provider store={store}>
      <MemoryRouter>{ui}</MemoryRouter>
    </Provider>,
  );
}

export function setupIntegrationTest(ui: React.JSX.Element) {
  cleanup();
  store.dispatch({
    type: 'auth/setUserName',
    payload: userMock.profile.profile.split('/')[1],
  });
  (useAuth as jest.Mock).mockReturnValue(userMock);
  return renderWithMemoryRouter(ui);
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
  const toolbarHeading = screen.getByText(/The Digital Twin as a Service/);
  expect(toolbarHeading).toBeInTheDocument();

  const openSettingsButton = screen.getByLabelText(/Open settings/);
  expect(openSettingsButton).toBeInTheDocument();
  expect(within(openSettingsButton).getByText('A')).toBeInTheDocument();

  const buttonsDiv = closestDiv(openSettingsButton);

  const githubButtonDiv = within(buttonsDiv).getByLabelText(
    'https://github.com/INTO-CPS-Association/DTaaS',
  );
  expect(githubButtonDiv).toBeInTheDocument();
  const githubButton = within(githubButtonDiv).getByRole('link');
  expect(githubButton).toBeInTheDocument();
  expect(within(githubButton).getByTestId(/GitHubIcon/)).toBeInTheDocument();

  const helpButtonDiv = within(buttonsDiv).getByLabelText(
    'https://into-cps-association.github.io/DTaaS',
  );
  expect(helpButtonDiv).toBeInTheDocument();
  const helpButton = within(helpButtonDiv).getByRole('link');
  expect(helpButton).toBeInTheDocument();
  expect(within(helpButton).getByTestId(/HelpOutlineIcon/)).toBeInTheDocument();

  await itOpensAndClosesTheDropdownMenu();
  await itShowsTheTooltipWhenHoveringIcon('Open settings', openSettingsButton);
  await itShowsTheTooltipWhenHoveringIcon(
    'https://into-cps-association.github.io/DTaaS',
    helpButtonDiv,
  );
  await itShowsTheTooltipWhenHoveringIcon(
    'https://github.com/INTO-CPS-Association/DTaaS',
    githubButton,
  );
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

export async function itShowsTheTooltipWhenHoveringIcon(
  toolTipText: string,
  button: HTMLElement,
) {
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
  const libraryButton = screen.getByRole('link', { name: /Library/ });
  const drawerInnerDiv = closestDiv(libraryButton);
  expect(drawerInnerDiv).toHaveStyle('width:calc(56px + 1px);');

  const menuButton = screen.getByLabelText(/Open drawer/i);
  expect(menuButton).toBeVisible();
  const header = menuButton.closest('header');
  expect(header).toBeInTheDocument();

  await userEvent.click(menuButton);

  expect(menuButton).not.toBeVisible();
  expect(drawerInnerDiv).toHaveStyle('width:240px');

  const chevronLeftIcon = screen.getByTestId(/ChevronLeftIcon/);
  const chevronLeftButton = chevronLeftIcon.closest('button');
  expect(chevronLeftButton).toBeInTheDocument();

  await userEvent.click(chevronLeftButton!);

  expect(drawerInnerDiv).toHaveStyle('width:calc(56px + 1px);');
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
