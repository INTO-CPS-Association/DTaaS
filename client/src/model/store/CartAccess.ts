import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store/storeTypes';
import LibraryAsset from 'model/backend/libraryAsset';
import * as cart from 'model/store/cart.slice';

function useCart() {
  const dispatch = useDispatch();
  const state = useSelector((store: RootState) => store.cart);
  const actions = {
    add: (asset: LibraryAsset) => dispatch(cart.addToCart(asset)),
    remove: (asset: LibraryAsset) => dispatch(cart.removeFromCart(asset)),
    clear: () => dispatch(cart.clearCart()),
  };

  return { state, actions };
}

export default useCart;
