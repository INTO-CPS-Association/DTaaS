import { screen } from '@testing-library/react';

export function itHasAllLayoutTestIds() {
  const toolbar = screen.getByTestId('toolbar');
  expect(toolbar).toBeInTheDocument();
  const footer = screen.getByTestId('footer');
  expect(footer).toBeInTheDocument();
  const menu = screen.getByTestId('menu');
  expect(menu).toBeInTheDocument();
}
