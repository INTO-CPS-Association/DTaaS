import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from 'store/store';
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
    deleteAsset: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(
        (asset) => asset.path !== action.payload,
      );
    },
  },
});

export const selectAssetsByTypeAndPrivacy =
  (type: string, isPrivate: boolean) =>
  (state: RootState): Asset[] =>
    state.assets.items.filter(
      (asset) => asset.type === type && asset.isPrivate === isPrivate,
    );

export const { setAssets, deleteAsset } = assetsSlice.actions;

export default assetsSlice.reducer;
