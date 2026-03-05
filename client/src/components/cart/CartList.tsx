import useCart from 'model/store/CartAccess';
import LibraryAsset from 'model/backend/libraryAsset';

function CartList() {
  const { state } = useCart();
  return (
    <ul>
      {state.assets.map((a) => (
        <CartItemRender
          key={`${a.path}-${String(a.isPrivate)}`}
          asset={a}
        ></CartItemRender>
      ))}
    </ul>
  );
}

function CartItemRender({ asset }: Readonly<{ asset: LibraryAsset }>) {
  const displayPath = asset.isPrivate ? asset.path : `common/${asset.path}`;

  return <li>{displayPath}</li>;
}

export default CartList;
