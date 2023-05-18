import { Asset } from 'models/Asset';
import React from 'react';

interface OwnProps {
  assets: Asset[];
}

function CartList(props: OwnProps) {
  return (
    <ul>
      {props.assets.map((a, i) => (
        <CartItemRender key={i} asset={a}></CartItemRender>
      ))}
    </ul>
  );
}

function CartItemRender(props: { asset: Asset }) {
  return <li>{props.asset.path}</li>;
}

export default CartList;
