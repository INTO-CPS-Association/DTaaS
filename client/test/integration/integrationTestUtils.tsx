import { screen, within } from '@testing-library/react';

export function itHasAllLayoutTestIds() {
  const toolbar = screen.getByTestId('toolbar');
  expect(toolbar).toBeInTheDocument();
  const footer = screen.getByTestId('footer');
  expect(footer).toBeInTheDocument();
  const menu = screen.getByTestId('menu');
  expect(menu).toBeInTheDocument();
}

export function closestDiv(element: HTMLElement) {
  const div = element.closest('div');
  expect(div).toBeInTheDocument();
  return div!;
}

export function testToolbar(container: HTMLElement) {
  const toolbar = container.getElementsByClassName(
    'MuiToolbar-root MuiToolbar-gutters MuiToolbar-regular',
  )[0];
  expect(toolbar).toBeInTheDocument();
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
