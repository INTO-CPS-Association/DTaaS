import {
  cleanup,
  fireEvent,
  getDefaultNormalizer,
  render,
  screen,
  within,
} from '@testing-library/react';
import * as React from 'react';
import { useAuth } from 'react-oidc-context';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { ITabs } from 'route/IData';
import store from 'store/store';

export function testLayout(container: HTMLElement) {
  testToolbar(container);
  testMenu();
  testMenuToolbar();
  testFooter();
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
  (useAuth as jest.Mock).mockReturnValue({ userName: 'Default user' });
  return renderWithMemoryRouter(ui);
}

export function closestDiv(element: HTMLElement) {
  const div = element.closest('div');
  expect(div).toBeInTheDocument();
  return div!;
}

export function testMenu() {
  expect(screen.getByTestId(/ChevronLeftIcon/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Library/ })).toBeInTheDocument();
  expect(screen.getByTestId(/ExtensionIcon/)).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: /Digital Twins/ }),
  ).toBeInTheDocument();
  expect(screen.getByTestId(/PeopleIcon/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Workbench/ })).toBeInTheDocument();
  expect(screen.getByTestId(/EngineeringIcon/)).toBeInTheDocument();
}

export function testToolbar(container: HTMLElement) {
  const toolbar = container.getElementsByClassName(
    'MuiToolbar-root MuiToolbar-gutters MuiToolbar-regular',
  )[0];
  expect(toolbar).toBeInTheDocument();
}

export function testMenuToolbar() {
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

export function itShowsTheParagraphOfToTheSelectedTab(tablistsData: ITabs[][]) {
  it('shows the paragraph correlating to the tab that is selected', () => {
    tablistsData.forEach((tablistData) => {
      tablistData.forEach((tabData, tabIndex) => {
        const isFirstTab = tabIndex === 0;
        const tab = screen.getByRole('tab', {
          name: tabData.label,
          selected: isFirstTab,
        });
        expect(tab).toBeInTheDocument();

        fireEvent.click(tab);

        const tabParagraph = screen.getByText(tabData.body, {
          normalizer,
        });
        expect(tabParagraph).toBeInTheDocument();
      });
    });
  });
}
