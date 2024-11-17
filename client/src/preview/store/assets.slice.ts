import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from 'store/store';
import LibraryAsset from 'preview/util/libraryAsset';

interface AssetsState {
  items: LibraryAsset[];
}

const initialState: AssetsState = {
  items: [],
};

const assetsSlice = createSlice({
  name: 'assets',
  initialState,
  reducers: {
    setAssets: (state, action: PayloadAction<LibraryAsset[]>) => {
      state.items = action.payload;
    },
    setAsset: (state, action: PayloadAction<LibraryAsset>) => {
      const existingAsset = state.items.find(
        (asset) => asset.path === action.payload.path,
      );
      if (!existingAsset) {
        state.items.push(action.payload);
      }
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
  (state: RootState): LibraryAsset[] =>
    state.assets.items.filter(
      (asset) => asset.type === type && asset.isPrivate === isPrivate,
    );

export const selectAssetByPath = (path: string) => (state: RootState) =>
  state.assets.items.find((asset) => asset.path === path);

export const { setAssets, setAsset, deleteAsset } = assetsSlice.actions;

export default assetsSlice.reducer;
