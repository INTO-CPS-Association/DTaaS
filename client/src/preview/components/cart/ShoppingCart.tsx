import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import useCart from 'preview/store/CartAccess';
import CartList from './CartList';

function ShoppingCart() {
  const { actions } = useCart();
  const navigate = useNavigate();
  const [openDialog, setOpenDialog] = useState(false);

  const handleClearCart = () => {
    actions.clear();
    setOpenDialog(false);
  };

  return (
    <>
      <CartList />
      <div>
        <Button variant="contained" onClick={() => setOpenDialog(true)}>
          Clear Cart
        </Button>
        <Button variant="contained" onClick={() => navigate('/digitaltwins')}>
          Proceed
        </Button>
      </div>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Confirm Clear Cart</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to clear the cart?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} color="primary">
            No
          </Button>
          <Button onClick={handleClearCart} color="secondary" autoFocus>
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default ShoppingCart;
