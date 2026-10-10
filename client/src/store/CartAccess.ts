import { useDispatch, useSelector } from 'react-redux';
import {
  addToCart,
  cartSlice,
  clearCart,
  LibraryAsset,
  removeFromCart,
} from '@into-cps-association/dt-automation';

type CartState = ReturnType<typeof cartSlice>;
type CartStore = { cart: CartState };

function useCart() {
  const dispatch = useDispatch();
  const state = useSelector((store: CartStore) => store.cart);
  const actions = {
    add: (asset: LibraryAsset) => dispatch(addToCart(asset)),
    remove: (asset: LibraryAsset) => dispatch(removeFromCart(asset)),
    clear: () => dispatch(clearCart()),
  };

  return { state, actions };
}

export default useCart;
