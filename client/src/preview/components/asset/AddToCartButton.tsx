import { Button } from '@mui/material';
import LibraryAsset from 'model/backend/libraryAsset';
import useCart from 'preview/store/CartAccess';
import { useSelector } from 'react-redux';
import { selectAssetByPathAndPrivacy } from 'preview/store/assets.slice';

interface AddToCartButtonProps {
  assetPath: string;
  assetPrivacy: boolean;
}

function AddToCartButton({ assetPath, assetPrivacy }: AddToCartButtonProps) {
  const { state: cartState, actions } = useCart();
  const asset = useSelector(
    selectAssetByPathAndPrivacy(assetPath, assetPrivacy),
  ) as LibraryAsset;

  const isInCart = cartState.assets.some(
    (item: LibraryAsset) =>
      item.path === asset.path && item.isPrivate === asset.isPrivate,
  );

  const handleAddToCart = async () => {
    actions.add(asset);
  };

  const handleRemoveFromCart = async () => {
    actions.remove(asset);
  };

  return (
    <Button
      variant="contained"
      size="small"
      color="primary"
      onClick={() => {
        if (isInCart) {
          handleRemoveFromCart();
        } else {
          handleAddToCart();
        }
      }}
    >
      {isInCart ? 'Remove' : 'Add'}
    </Button>
  );
}

export default AddToCartButton;
