import React from 'react';
import useCart from 'preview/store/CartAccess';
import LibraryAsset from 'preview/util/LibraryAsset';

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

function CartItemRender(props: { asset: LibraryAsset }) {
  return <li>{props.asset.path}</li>;
}

export default CartList;