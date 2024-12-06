import { render, screen } from '@testing-library/react';
import CartList from 'preview/components/cart/CartList';
import * as React from 'react';
import * as cartAccess from 'preview/store/CartAccess';
import { mockLibraryAsset } from 'test/preview/__mocks__/global_mocks';

describe('CartList', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render a list of assets', () => {
    jest.spyOn(cartAccess, 'default').mockReturnValue({
      state: { assets: [mockLibraryAsset] },
      actions: { add: jest.fn(), remove: jest.fn(), clear: jest.fn() },
    });

    render(<CartList />);

    expect(screen.getByText('path')).toBeInTheDocument();
  });

  it('should render a list of common assets', () => {
    mockLibraryAsset.isPrivate = false;
    jest.spyOn(cartAccess, 'default').mockReturnValue({
      state: { assets: [mockLibraryAsset] },
      actions: { add: jest.fn(), remove: jest.fn(), clear: jest.fn() },
    });

    render(<CartList />);

    expect(screen.getByText('common/path')).toBeInTheDocument();
  });
});
