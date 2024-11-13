import * as React from 'react';
import { Button } from '@mui/material';
import LibraryAsset from 'preview/util/libraryAsset';
import useCart from 'preview/store/CartAccess';
import { useSelector } from 'react-redux';
import { selectAssetByPath } from 'preview/store/assets.slice';

interface AddToCartButtonProps {
  assetPath: string;
}

function AddToCartButton({ assetPath }: AddToCartButtonProps) {
  const { state: cartState, actions } = useCart();
  const asset = useSelector(selectAssetByPath(assetPath)) as LibraryAsset;

  const isInCart = cartState.assets.some(
    (item: LibraryAsset) => item.path === asset.path,
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
