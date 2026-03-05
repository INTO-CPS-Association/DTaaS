import { screen, within } from '@testing-library/react';

export async function testAssetBoard() {
  const grid = screen.getByRole('grid');
  expect(grid).toBeInTheDocument();
}

export async function testGridItem(assetName: string) {
  const gridItem = within(screen.getByRole('grid')).getByText(assetName);
  expect(gridItem).toBeInTheDocument();
}
