import { act, renderHook } from '@testing-library/react';
import * as cart from '@into-cps-association/dt-automation';
import { useDispatch, useSelector } from 'react-redux';
import useCart from 'store/CartAccess';
import { mockLibraryAsset } from 'test/__mocks__/global_mocks';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('@into-cps-association/dt-automation', () => ({
  ...jest.requireActual('@into-cps-association/dt-automation'),
  addToCart: jest.fn(),
  removeFromCart: jest.fn(),
  clearCart: jest.fn(),
}));

describe('useCart', () => {
  const dispatch = jest.fn();
  const mockState = { assets: [] };

  beforeEach(() => {
    dispatch.mockClear();
    (useDispatch as unknown as jest.Mock).mockReturnValue(dispatch);
    (useSelector as unknown as jest.Mock).mockImplementation(
      (selector: (store: { cart: typeof mockState }) => unknown) =>
        selector({ cart: mockState }),
    );
  });

  it('returns the cart state', () => {
    const { result } = renderHook(() => useCart());
    expect(result.current.state).toEqual(mockState);
  });

  it('dispatches addToCart action', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.actions.add(mockLibraryAsset);
    });

    expect(dispatch).toHaveBeenCalledWith(cart.addToCart(mockLibraryAsset));
  });

  it('dispatches removeFromCart action', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.actions.remove(mockLibraryAsset);
    });

    expect(dispatch).toHaveBeenCalledWith(
      cart.removeFromCart(mockLibraryAsset),
    );
  });

  it('dispatches clearCart action', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.actions.clear();
    });

    expect(dispatch).toHaveBeenCalledWith(cart.clearCart());
  });
});
