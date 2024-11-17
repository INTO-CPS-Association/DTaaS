import { createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from 'store/store';

export interface LibraryConfigFile {
  assetPath: string;
  fileName: string;
  fileContent: string;
  isModified: boolean;
}

const initialState: LibraryConfigFile[] = [];

const libraryFilesSlice = createSlice({
  name: 'libraryConfigFiles',
  initialState,
  reducers: {
    addOrUpdateLibraryFile: (
      state,
      action: PayloadAction<LibraryConfigFile>,
    ) => {
      const { assetPath, fileName, fileContent, ...rest } = action.payload;

      if (!fileName) return;

      const index = state.findIndex(
        (file) => file.fileName === fileName && file.assetPath === assetPath,
      );

      if (index >= 0) {
        state[index] = {
          ...state[index],
          ...rest,
          fileContent,
          isModified: true,
        };
      } else {
        state.push({ assetPath, fileName, fileContent, isModified: false });
      }
    },

    removeAllFiles: (state) => {
      state.splice(0, state.length);
    },
  },
});

export const selectModifiedFiles = createSelector(
  (state: RootState) => state.files,
  (files) => files.filter((file) => file.isModified),
);

export const { addOrUpdateLibraryFile, removeAllFiles } =
  libraryFilesSlice.actions;
export default libraryFilesSlice.reducer;
