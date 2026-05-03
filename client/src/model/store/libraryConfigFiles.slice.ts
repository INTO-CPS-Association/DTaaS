import { createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LibraryConfigFile } from 'model/backend/interfaces/sharedInterfaces';
import { RootState } from 'store/storeTypes';

const initialState: LibraryConfigFile[] = [];

interface LibraryFileKey {
  fileName: string;
  assetPath: string;
  isNew: boolean;
  isPrivate: boolean;
}

// Helper to find library file index
const findLibraryFileIndex = (
  state: LibraryConfigFile[],
  key: LibraryFileKey,
) =>
  state.findIndex(
    (file) =>
      file.fileName === key.fileName &&
      file.assetPath === key.assetPath &&
      file.isNew === key.isNew &&
      file.isPrivate === key.isPrivate,
  );

// Helper to upsert library file
const upsertLibraryFile = (
  state: LibraryConfigFile[],
  index: number,
  payload: LibraryConfigFile,
) => {
  const { fileName, assetPath, isNew, isPrivate, ...rest } = payload;
  if (index >= 0) {
    state[index] = { ...state[index], ...rest, isModified: true, isNew };
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
};

const libraryFilesSlice = createSlice({
  name: 'libraryConfigFiles',
  initialState,
  reducers: {
    addOrUpdateLibraryFile: (
      state,
      action: PayloadAction<LibraryConfigFile>,
    ) => {
      const { fileName, assetPath, isNew, isPrivate } = action.payload;

      if (!fileName || !assetPath) return;

      const index = findLibraryFileIndex(state, {
        fileName,
        assetPath,
        isNew,
        isPrivate,
      });

      upsertLibraryFile(state, index, action.payload);
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

    initializeLibraryFile: (
      state,
      action: PayloadAction<LibraryConfigFile>,
    ) => {
      const { fileName, assetPath, isNew, isPrivate } = action.payload;
      if (!fileName || !assetPath) return;
      const index = findLibraryFileIndex(state, {
        fileName,
        assetPath,
        isNew,
        isPrivate,
      });
      if (index < 0) {
        state.push({ ...action.payload, isModified: false });
      }
    },
  },
});

export const selectModifiedLibraryFiles = createSelector(
  (state: RootState) => state.libraryConfigFiles,
  (files) => files.filter((file) => !file.isNew),
);

export const {
  addOrUpdateLibraryFile,
  initializeLibraryFile,
  removeAllFiles,
  removeAllModifiedLibraryFiles,
} = libraryFilesSlice.actions;
export default libraryFilesSlice.reducer;
