import * as React from 'react';
import { render, screen } from '@testing-library/react';
import AssetBoard from 'components/AssetBoard';
import { mockAssets } from '../__mocks__/util_mocks';

jest.unmock('components/AssetBoard');
describe('AssetBoard', () => {
  it('renders AssetCard components for each asset', () => {
    render(<AssetBoard pathToAssets="test-path" />);
    const cards = screen.getAllByRole('card');
    expect(cards).toHaveLength(mockAssets.length);
  });
});
