import { Asset } from 'components/asset/Asset';
import React from 'react';
import useCart from 'store/CartAccess';

function CartList() {
  const { state } = useCart();
  return (
    <ul>
      {state.assets.map((a, i) => (
        <CartItemRender key={i} asset={a}></CartItemRender>
      ))}
    </ul>
  );
}

function CartItemRender(props: { asset: Asset }) {
  return <li>{props.asset.path}</li>;
}

export default CartList;
