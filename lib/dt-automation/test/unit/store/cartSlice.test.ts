import cartSlice, {
  addToCart,
  clearCart,
  removeFromCart,
} from 'model/store/cart.slice';
import LibraryAsset from 'model/backend/libraryAsset';
import { mockLibraryAsset } from 'test/__mocks__/global_mocks';

describe('cart reducer', () => {
  const initialCartState: { assets: LibraryAsset[] } = { assets: [] };
  const asset1 = mockLibraryAsset;
  const asset2 = {
    ...mockLibraryAsset,
    path: 'path2',
  } as unknown as LibraryAsset;

  it('should handle addToCart', () => {
    const newState = cartSlice(initialCartState, addToCart(asset1));
    expect(newState.assets).toEqual([asset1]);
  });

  it('should not add duplicate assets to cart', () => {
    const stateWithAsset = { assets: [asset1] };
    const newState = cartSlice(stateWithAsset, addToCart(asset1));
    expect(newState.assets).toEqual([asset1]);
  });

  it('should handle removeFromCart', () => {
    const stateWithAssets = { assets: [asset1, asset2] };
    const newState = cartSlice(stateWithAssets, removeFromCart(asset1));
    expect(newState.assets).toEqual([asset2]);
  });

  it('should handle clearCart', () => {
    const stateWithAssets = { assets: [asset1, asset2] };
    const newState = cartSlice(stateWithAssets, clearCart());
    expect(newState.assets).toEqual([]);
  });
});
