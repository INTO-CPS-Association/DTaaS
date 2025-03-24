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

export async function testDrawer() {
  expect(screen.getByTestId(/ChevronLeftIcon/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /^Library$/ })).toBeInTheDocument();
  expect(screen.getByTestId(/ExtensionIcon/)).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: /^Digital Twins$/ }),
  ).toBeInTheDocument();
  expect(screen.getByTestId(/PeopleIcon/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Workbench/ })).toBeInTheDocument();
  expect(screen.getByTestId(/EngineeringIcon/)).toBeInTheDocument();

  await itOpensAndClosesTheDrawer();
}

export async function testToolbar() {
  expect(screen.getByText(/The Digital Twin as a Service/)).toBeInTheDocument();
  await testToolbarButton(
    'https://github.com/INTO-CPS-Association/DTaaS',
    'GitHubIcon',
  );
  await testToolbarButton(
    'https://into-cps-association.github.io/DTaaS',
    'HelpOutlineIcon',
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
