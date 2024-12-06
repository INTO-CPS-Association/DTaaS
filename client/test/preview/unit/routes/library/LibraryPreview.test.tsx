import * as React from 'react';
import LibraryPreview from 'preview/route/library/LibraryPreview';
import store from 'store/store';
import { act, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { useGetAndSetUsername } from 'util/auth/Authentication';

jest.mock('react-oidc-context', () => ({
  ...jest.requireActual('react-oidc-context'),
  useAuth: jest.fn(),
}));

jest.mock('util/auth/Authentication', () => ({
  ...jest.requireActual('util/auth/Authentication'),
  useGetAndSetUsername: jest.fn(),
}));

jest.mock('preview/components/asset/AssetLibrary');

jest.mock('preview/components/cart/ShoppingCart');

jest.mock('components/tab/TabComponent', () => jest.fn(() => <div data-testid="tab-component"></div>));

jest.mock('page/Layout', () => jest.fn(() => <div data-testid="layout"></div>));

describe('LibraryPreview', () => {
  const signinRedirect = jest.fn();

  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({
      signinRedirect,
      user: { profile: { profile: 'profileUrl' } },
    });

    (useGetAndSetUsername as jest.Mock).mockReturnValue(jest.fn());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it.skip('should display content of tabs', async () => {
    await act(async () => {
      render(
        <Provider store={store}>
          <MemoryRouter>
            <LibraryPreview />
          </MemoryRouter>
        </Provider>,
      );
    });

    const tabComponent = screen.getByTestId('tab-component');
    expect(tabComponent).toBeInTheDocument();

    const assetLibrary = screen.getByTestId('asset-library');
    expect(assetLibrary).toBeInTheDocument();

    const shoppingCart = screen.getByTestId('shopping-cart');
    expect(shoppingCart).toBeInTheDocument();
  });
});
