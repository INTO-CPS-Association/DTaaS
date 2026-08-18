import { useDispatch, useSelector } from 'react-redux';
import LibraryAsset from 'src/libraryAsset';
import * as cart from 'src/store/cart.slice';
import type { CartState } from 'src/store/cart.slice';

function useCart() {
  const dispatch = useDispatch();
  const state = useSelector((store: { cart: CartState }) => store.cart);
  const actions = {
    add: (asset: LibraryAsset) => dispatch(cart.addToCart(asset)),
    remove: (asset: LibraryAsset) => dispatch(cart.removeFromCart(asset)),
    clear: () => dispatch(cart.clearCart()),
  };

  return { state, actions };
}

export default useCart;
