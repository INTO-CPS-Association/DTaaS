import { useState } from 'react';
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
import CartList from 'preview/components/cart/CartList';

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
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '230px',
        padding: '10px',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          flex: '1 1 auto',
          overflowY: 'auto',
          marginBottom: '10px',
        }}
      >
        <CartList />
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          flexShrink: 0,
          position: 'sticky',
          bottom: 0,
          background: 'white',
          padding: '5px 0',
        }}
      >
        <Button variant="contained" onClick={() => setOpenDialog(true)}>
          Clear
        </Button>
        <Button
          variant="contained"
          onClick={() => navigate('/preview/digitaltwins')}
        >
          Proceed
        </Button>
      </Box>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Confirm Clear</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to clear?</DialogContentText>
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
