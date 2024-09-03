import * as React from 'react';
import { Button } from '@mui/material';
// import { Asset } from './Asset';

// import useCart from '../../store/CartAccess';


function LogButton() {
  // const { state, actions } = useCart();
  return (
    <Button
      variant="contained"
      // disabled={isDisabled}
      size="small"
      color="primary"
    >
      Log
    </Button>
  );
}

export default LogButton;
