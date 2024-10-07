import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Asset } from '../components/asset/Asset';

interface AssetsState {
  items: Asset[];
}

const initialState: AssetsState = {
  items: [],
};

const assetsSlice = createSlice({
  name: 'assets',
  initialState,
  reducers: {
    setAssets: (state, action: PayloadAction<Asset[]>) => {
      state.items = action.payload;
    },
  },
});

export const { setAssets } = assetsSlice.actions;

export default assetsSlice.reducer;
