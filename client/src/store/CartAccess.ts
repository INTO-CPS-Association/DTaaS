import { Asset } from 'models/Asset';
import * as cart from './Redux/slices/cart.slice';
import { useAppDispatch, useAppSelector } from './Redux/hooks';

function useCart() {
  const dispatch = useAppDispatch();
  const state = useAppSelector((store) => store.cart);
  const actions = {
    add: (asset: Asset) => dispatch(cart.addToCart(asset)),
    remove: (asset: Asset) => dispatch(cart.removeFromCart(asset)),
    clear: () => dispatch(cart.clearCart()),
  };

  return { state, actions };
}

export default useCart;
