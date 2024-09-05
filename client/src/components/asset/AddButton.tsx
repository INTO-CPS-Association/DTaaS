import * as React from 'react';
import { Button } from '@mui/material';
import { Asset } from './Asset';
import useCart from '../../store/CartAccess';

function AddButton(asset: Asset) {
  const { state, actions } = useCart();
  return (
    <Button
      variant="contained"
      fullWidth
      disabled={!!state.assets.find((a: { path: string; }) => a.path === asset.path)}
      size="small"
      color="primary"
      onClick={() => {
        actions.add(asset);
      }}
    >
      Select
    </Button>
  );
}

export default AddButton;