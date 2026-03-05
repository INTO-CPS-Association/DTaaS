import { Button } from '@mui/material';
import LibraryAsset from 'model/backend/libraryAsset';
import useCart from 'model/store/CartAccess';
import { useSelector } from 'react-redux';
import { selectAssetByPathAndPrivacy } from 'model/store/assets.slice';

interface AddToCartButtonProps {
  readonly assetPath: string;
  readonly assetPrivacy: boolean;
}

// Helper to check if asset is in cart
const isAssetInCart = (
  cartAssets: LibraryAsset[],
  asset: LibraryAsset,
): boolean =>
  cartAssets.some(
    (item: LibraryAsset) =>
      item.path === asset.path && item.isPrivate === asset.isPrivate,
  );

function AddToCartButton({ assetPath, assetPrivacy }: AddToCartButtonProps) {
  const { state: cartState, actions } = useCart();
  const asset = useSelector(
    selectAssetByPathAndPrivacy(assetPath, assetPrivacy),
  ) as LibraryAsset;

  const isInCart = isAssetInCart(cartState.assets, asset);

  const handleClick = () => {
    if (isInCart) {
      actions.remove(asset);
    } else {
      actions.add(asset);
    }
  };

  return (
    <Button
      variant="contained"
      size="small"
      color="primary"
      onClick={handleClick}
    >
      {isInCart ? 'Remove' : 'Add'}
    </Button>
  );
}

export default AddToCartButton;
