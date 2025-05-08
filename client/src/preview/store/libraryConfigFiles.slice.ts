import { createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LibraryConfigFile } from 'model/backend/gitlab/interfaces';
import { RootState } from 'store/store';

const initialState: LibraryConfigFile[] = [];

const libraryFilesSlice = createSlice({
  name: 'libraryConfigFiles',
  initialState,
  reducers: {
    addOrUpdateLibraryFile: (
      state,
      action: PayloadAction<LibraryConfigFile>,
    ) => {
      const { fileName, assetPath, isNew, isPrivate, ...rest } = action.payload;

      if (!fileName || !assetPath) return;

      const index = state.findIndex(
        (file) =>
          file.fileName === fileName &&
          file.assetPath === assetPath &&
          file.isNew === isNew &&
          file.isPrivate === isPrivate,
      );

      if (index >= 0) {
        state[index] = {
          ...state[index],
          ...rest,
          isModified: true,
          isNew,
        };
      } else {
        state.push({
          fileName,
          assetPath,
          ...rest,
          isModified: false,
          isNew,
          isPrivate,
        });
      }
    },

    removeAllFiles: (state) => {
      state.splice(0, state.length);
    },

    removeAllModifiedLibraryFiles: (state) => {
      const filesToSave = state.filter(
        (file) => file.isModified && !file.isNew,
      );
      filesToSave.forEach((file) => {
        const index = state.findIndex(
          (f) => f.fileName === file.fileName && !f.isNew,
        );
        if (index >= 0) {
          state.splice(index, 1);
        }
      });
    },
  },
});

export const selectModifiedLibraryFiles = createSelector(
  (state: RootState) => state.libraryConfigFiles,
  (files) => files.filter((file) => !file.isNew),
);

export const {
  addOrUpdateLibraryFile,
  removeAllFiles,
  removeAllModifiedLibraryFiles,
} = libraryFilesSlice.actions;
export default libraryFilesSlice.reducer;
