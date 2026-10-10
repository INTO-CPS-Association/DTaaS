import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Box,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import useCart from 'store/CartAccess';
import { removeAllFiles } from '@into-cps-association/dt-automation';
import { useDispatch } from 'react-redux';
import CartList from 'components/cart/CartList';
import { logDismiss } from 'util/logger/logger';

function ShoppingCart() {
  const { state, actions } = useCart();
  const navigate = useNavigate();
  const [openDialog, setOpenDialog] = useState(false);
  const dispatch = useDispatch();
  const isEmpty = state.assets.length === 0;

  const cartLogContext = (button: string) =>
    JSON.stringify({
      cart: { count: state.assets.length, button },
    });

  const handleClearCart = () => {
    actions.clear();
    setOpenDialog(false);
    dispatch(removeAllFiles());
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* An empty panel said nothing about what it was for. It used to be a
          fixed three hundred pixels of blank space under a heading, so the
          first thing a person met on this page was a box with nothing in it
          and no clue what would ever fill it. */}
      {isEmpty ? (
        <Typography variant="body2" color="text.secondary">
          Nothing chosen yet. Add functions, models, tools or data from the list
          and they will be listed here.
        </Typography>
      ) : (
        <Box sx={{ maxHeight: 240, overflowY: 'auto' }}>
          <CartList />
        </Box>
      )}

      {/* Both actions need something to act on, so neither is offered until
          there is. Proceed used to carry an empty selection to the next page,
          which arrived with nothing to build from. */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          disabled={isEmpty}
          onClick={() => navigate('/preview/digitaltwins')}
          data-logger-element="button"
          data-logger-label="Proceed"
          data-logger-context={cartLogContext('proceed')}
        >
          Create a Digital Twin
        </Button>
        <Button
          variant="outlined"
          disabled={isEmpty}
          onClick={() => setOpenDialog(true)}
          data-logger-element="button"
          data-logger-label="Clear Cart"
          data-logger-context={cartLogContext('clear')}
        >
          Clear
        </Button>
      </Box>

      <Dialog
        open={openDialog}
        onClose={(_event, reason) => {
          logDismiss({
            element: 'dialog',
            label: 'Confirm Clear Cart',
            reason,
            context: { cart: { count: state.assets.length } },
          });
          setOpenDialog(false);
        }}
      >
        <DialogTitle>Confirm Clear</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to clear?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenDialog(false)}
            color="primary"
            data-logger-element="button"
            data-logger-label="Clear Cart No"
            data-logger-context={cartLogContext('clear-cancel')}
          >
            No
          </Button>
          <Button
            onClick={handleClearCart}
            color="secondary"
            autoFocus
            data-logger-element="button"
            data-logger-label="Clear Cart Yes"
            data-logger-context={cartLogContext('clear-confirm')}
          >
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ShoppingCart;
