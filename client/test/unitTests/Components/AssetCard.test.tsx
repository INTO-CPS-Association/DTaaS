import * as React from 'react';
import { render, screen } from '@testing-library/react';
import AssetCard from 'components/asset/AssetCard';

jest.deepUnmock('components/asset/AssetCard');

describe('AssetCard', () => {
  const assetMock = {
    name: 'Test Asset',
    description: 'Test Description',
    path: 'test-path',
  };

  beforeEach(() => {
    render(<AssetCard asset={assetMock} />);
  });

  test('renders asset name correctly', () => {
    expect(screen.getByText(assetMock.name)).toBeInTheDocument();
  });

  test('renders asset description correctly', () => {
    expect(screen.getByText(assetMock.description)).toBeInTheDocument();
  });

  test('renders AddButton component', () => {
    expect(screen.getByText('AddButton')).toBeInTheDocument();
  });
});
