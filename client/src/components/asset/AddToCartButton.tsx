import { Button } from '@mui/material';
import LibraryAsset from 'model/backend/libraryAsset';
import useCart from 'model/store/CartAccess';
import { useSelector } from 'react-redux';
import { selectAssetByPathAndPrivacy } from 'model/store/assets.slice';

interface AddToCartButtonProps {
  readonly assetPath: string;
  readonly assetPrivacy: boolean;
}

type CartActions = ReturnType<typeof useCart>['actions'];

// Helper to check if asset is in cart
const isAssetInCart = (
  cartAssets: LibraryAsset[],
  asset: LibraryAsset,
): boolean =>
  cartAssets.some(
    (item: LibraryAsset) =>
      item.path === asset.path && item.isPrivate === asset.isPrivate,
  );

const getCartActionLabel = (isInCart: boolean): string =>
  isInCart ? 'Remove' : 'Add';

const toggleCartAsset = (
  actions: CartActions,
  asset: LibraryAsset,
  isInCart: boolean,
): void => {
  if (isInCart) {
    actions.remove(asset);
    return;
  }
  actions.add(asset);
};

function AddToCartButton({ assetPath, assetPrivacy }: AddToCartButtonProps) {
  const { state: cartState, actions } = useCart();
  const asset = useSelector(
    selectAssetByPathAndPrivacy(assetPath, assetPrivacy),
  ) as LibraryAsset;

  const isInCart = isAssetInCart(cartState.assets, asset);
  const actionLabel = getCartActionLabel(isInCart);

  const handleClick = () => toggleCartAsset(actions, asset, isInCart);

  return (
    <Button
      variant="contained"
      size="small"
      color="primary"
      onClick={handleClick}
      data-logger-element="button"
      data-logger-label={actionLabel}
      data-logger-context={JSON.stringify({ asset: assetPath })}
    >
      {actionLabel}
    </Button>
  );
}

export default AddToCartButton;
