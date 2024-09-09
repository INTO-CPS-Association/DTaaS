import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Asset } from 'components/asset/Asset';

export interface CartState {
  assets: Asset[];
}

const initState: CartState = {
  assets: [],
};

const cartSlice = createSlice({
  name: 'cart',
  initialState: initState,
  reducers: {
    addToCart: (state: CartState, action: PayloadAction<Asset>) => {
      if (!state.assets.find((asset) => asset.path === action.payload.path))
        state.assets.push(action.payload);
    },
    removeFromCart: (state: CartState, action: PayloadAction<Asset>) => {
      state.assets = state.assets.filter((a) => a.path !== action.payload.path);
    },
    clearCart: (state: CartState) => {
      state.assets = [];
    },
  },
});

export const { addToCart, removeFromCart, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
