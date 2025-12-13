import useCart from 'preview/store/CartAccess';
import LibraryAsset from 'model/backend/libraryAsset';

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
  const displayPath = props.asset.isPrivate
    ? props.asset.path
    : `common/${props.asset.path}`;

  return <li>{displayPath}</li>;
}

export default CartList;
