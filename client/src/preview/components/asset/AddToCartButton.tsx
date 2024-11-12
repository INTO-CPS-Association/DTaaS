import * as React from 'react';
import { Button } from '@mui/material';
import LibraryAsset from 'preview/util/LibraryAsset';
import useCart from 'preview/store/CartAccess';

interface AddToCartButtonProps {
  assetName: string;
}

const fakeAsset: LibraryAsset = {
  assetName: 'fakeAsset',
  path: 'fakePath',
  isPrivate: false,
  type: 'fakeType',
  fullDescription: 'fakeDescription',

  async getFullDescription() {
    this.fullDescription = 'This is a description';
  },
};

function AddToCartButton({ assetName }: AddToCartButtonProps) {
  const { state: cartState, actions } = useCart();
  const asset = fakeAsset;

  const isInCart = cartState.assets.some((item: LibraryAsset) => item.path === asset.path);

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
