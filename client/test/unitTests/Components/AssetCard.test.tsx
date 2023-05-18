import * as React from 'react';
import { render, screen } from '@testing-library/react';
import AssetCard from 'components/AssetBoard/AssetCard';

jest.deepUnmock('components/AssetBoard/AssetCard');

describe('AssetCard', () => {
  const assetMock = {
    name: 'Test Asset',
    description: 'Test Description',
    isDir: true,
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
