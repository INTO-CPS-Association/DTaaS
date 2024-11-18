import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Box,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import useCart from 'preview/store/CartAccess';
import { removeAllFiles } from 'preview/store/libraryConfigFiles.slice';
import { useDispatch } from 'react-redux';
import CartList from './CartList';

function ShoppingCart() {
  const { actions } = useCart();
  const navigate = useNavigate();
  const [openDialog, setOpenDialog] = useState(false);
  const dispatch = useDispatch();

  const handleClearCart = () => {
    actions.clear();
    setOpenDialog(false);
    dispatch(removeAllFiles());
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="space-between"
      minHeight="170px"
      padding="10px"
    >
      <CartList />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 'auto',
        }}
      >
        <Button variant="contained" onClick={() => setOpenDialog(true)}>
          Clear Cart
        </Button>
        <Button
          variant="contained"
          onClick={() => navigate('/preview/digitaltwins')}
        >
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
    </Box>
  );
}

export default ShoppingCart;
