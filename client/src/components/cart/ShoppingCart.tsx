import { Button } from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import useCart from 'store/CartAccess';
import CartList from './CartList';

function ShoppingCart() {
  const { actions } = useCart();
  const navigate = useNavigate();

  return (
    <>
      <CartList></CartList>
      <div>
        <Button variant="contained" onClick={() => actions.clear()}>
          Clear Cart
        </Button>
        <Button variant="contained" onClick={() => navigate('/digitaltwins')}>
          Proceed
        </Button>
      </div>
    </>
  );
}

export default ShoppingCart;
