import { useDispatch, useSelector } from 'react-redux';
import { Asset } from 'components/asset/Asset';
import * as cart from './cart.slice';
import { RootState } from './store';

function useCart() {
  const dispatch = useDispatch();
  const state = useSelector((store: RootState) => store.cart);
  const actions = {
    add: (asset: Asset) => dispatch(cart.addToCart(asset)),
    remove: (asset: Asset) => dispatch(cart.removeFromCart(asset)),
    clear: () => dispatch(cart.clearCart()),
  };

  return { state, actions };
}

export default useCart;
