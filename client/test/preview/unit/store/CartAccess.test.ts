import { renderHook, act } from '@testing-library/react';
import { useDispatch, useSelector } from 'react-redux';
import useCart from 'preview/store/CartAccess';
import * as cart from 'preview/store/cart.slice';
import { mockLibraryAsset } from 'test/preview/__mocks__/global_mocks';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('preview/store/cart.slice', () => ({
  addToCart: jest.fn(),
  removeFromCart: jest.fn(),
  clearCart: jest.fn(),
}));

describe('useCart', () => {
  const dispatch = jest.fn();
  const mockState = { items: [] };

  beforeEach(() => {
    (useDispatch as unknown as jest.Mock).mockReturnValue(dispatch);
    (useSelector as unknown as jest.Mock).mockImplementation((selector) =>
      selector({ cart: mockState }),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return the cart state', () => {
    const { result } = renderHook(() => useCart());
    expect(result.current.state).toEqual(mockState);
  });

  it('should dispatch addToCart action', () => {
    const { result } = renderHook(() => useCart());
    const asset = mockLibraryAsset;
    act(() => {
      result.current.actions.add(asset);
    });
    expect(dispatch).toHaveBeenCalledWith(cart.addToCart(asset));
  });

  it('should dispatch removeFromCart action', () => {
    const { result } = renderHook(() => useCart());
    const asset = mockLibraryAsset;
    act(() => {
      result.current.actions.remove(asset);
    });
    expect(dispatch).toHaveBeenCalledWith(cart.removeFromCart(asset));
  });
});
