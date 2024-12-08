import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from 'store/store';
import LibraryAsset from 'preview/util/libraryAsset';
import { createSelector } from 'reselect';

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
        (asset) =>
          asset.path === action.payload.path &&
          asset.isPrivate === action.payload.isPrivate,
      );
      if (!existingAsset) {
        state.items.push(action.payload);
      }
    },
    deleteAsset: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(
        (asset) => asset.path !== action.payload && asset.isPrivate === true,
      );
    },
  },
});

export const selectAssetsByTypeAndPrivacy = (
  type: string,
  isPrivate: boolean,
) =>
  createSelector(
    (state: RootState) => state.assets.items,
    (items: LibraryAsset[]) =>
      items.filter(
        (item) => item.type === type && item.isPrivate === isPrivate,
      ),
  );

export const selectAssetByPathAndPrivacy =
  (path: string, isPrivate: boolean) => (state: RootState) =>
    state.assets.items.find(
      (asset) => asset.path === path && asset.isPrivate === isPrivate,
    );

export const { setAssets, setAsset, deleteAsset } = assetsSlice.actions;

export default assetsSlice.reducer;
