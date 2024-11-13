import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import LibraryAsset from 'preview/util/libraryAsset';

export interface CartState {
  assets: LibraryAsset[];
}

const initState: CartState = {
  assets: [],
};

const cartSlice = createSlice({
  name: 'cart',
  initialState: initState,
  reducers: {
    addToCart: (state, action: PayloadAction<LibraryAsset>) => {
      if (!state.assets.find((asset) => asset.path === action.payload.path)) {
        state.assets.push(action.payload);
      }
    },
    removeFromCart: (state, action: PayloadAction<LibraryAsset>) => {
      state.assets = state.assets.filter((a) => a.path !== action.payload.path);
    },
    clearCart: (state) => {
      state.assets = [];
    },
  },
});

export const { addToCart, removeFromCart, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
