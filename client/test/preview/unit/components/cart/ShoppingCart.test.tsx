import { fireEvent, render, screen } from '@testing-library/react';
import ShoppingCart from 'preview/components/cart/ShoppingCart';
import * as React from 'react';
import { Provider } from 'react-redux';
import store from 'store/store';
import { BrowserRouter } from 'react-router-dom';
import * as cartAccess from 'preview/store/CartAccess';

jest.mock('preview/store/CartAccess', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock(
  'preview/components/cart/CartList',
  () =>
    function MockCartList() {
      return <div data-testid="cart-list"></div>;
    },
);

describe('ShoppingCart', () => {
  const addMock = jest.fn();
  const removeMock = jest.fn();
  const clearMock = jest.fn();

  beforeEach(() => {
    (cartAccess.default as jest.Mock).mockReturnValue({
      state: { assets: [] },
      actions: { add: addMock, remove: removeMock, clear: clearMock },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it.skip("should open the confirmation dialog when clicking 'Clear'", () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <ShoppingCart />
        </BrowserRouter>
      </Provider>,
    );

    fireEvent.click(screen.getByText('Clear'));

    expect(screen.getByText('Confirm Clear')).toBeInTheDocument();
  });

  it.skip("should close the confirmation dialog when clicking 'No'", () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <ShoppingCart />
        </BrowserRouter>
      </Provider>,
    );

    fireEvent.click(screen.getByText('Clear'));
    expect(screen.getByText('Confirm Clear')).toBeInTheDocument();

    fireEvent.click(screen.getByText('No'));
    expect(screen.queryByText('Confirm Clear')).not.toBeInTheDocument();
  });
});
