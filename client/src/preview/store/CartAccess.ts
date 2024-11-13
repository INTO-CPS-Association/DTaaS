import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store/store';
import LibraryAsset from 'preview/util/LibraryAsset';
import * as cart from './cart.slice';

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
