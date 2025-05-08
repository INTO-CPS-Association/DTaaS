import { createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FileState } from 'model/backend/gitlab/interfaces';
import { RootState } from 'store/store';

const initialState: FileState[] = [];

const filesSlice = createSlice({
  name: 'files',
  initialState,
  reducers: {
    addOrUpdateFile: (state, action: PayloadAction<FileState>) => {
      const { name, isNew, ...rest } = action.payload;

      if (!name) return;

      const index = state.findIndex(
        (file) => file.name === name && file.isNew === isNew,
      );

      if (index >= 0) {
        state[index] = {
          ...state[index],
          ...rest,
          isModified: true,
          isNew,
        };
      } else {
        state.push({ name, ...rest, isModified: false, isNew });
      }
    },

    renameFile: (
      state,
      action: PayloadAction<{ oldName: string; newName: string }>,
    ) => {
      const index = state.findIndex(
        (file) => file.name === action.payload.oldName,
      );
      if (index >= 0) {
        state[index].name = action.payload.newName;
        state[index].isModified = true;

        const extension = action.payload.newName.split('.').pop();
        if (extension === 'md') {
          state[index].type = 'description';
        } else if (['json', 'yaml', 'yml'].includes(extension!)) {
          state[index].type = 'configuration';
        } else {
          state[index].type = 'lifecycle';
        }
      }
    },

    removeAllModifiedFiles: (state) => {
      const filesToSave = state.filter(
        (file) => file.isModified && !file.isNew,
      );
      filesToSave.forEach((file) => {
        const index = state.findIndex((f) => f.name === file.name && !f.isNew);
        if (index >= 0) {
          state.splice(index, 1);
        }
      });
    },

    deleteFile: (state, action: PayloadAction<string>) => {
      const index = state.findIndex((file) => file.name === action.payload);
      if (index >= 0) {
        state.splice(index, 1);
      }
    },

    removeAllCreationFiles: (state) => {
      const protectedFiles = ['description.md', 'README.md', '.gitlab-ci.yml'];

      const remainingFiles = state.filter((file) =>
        protectedFiles.includes(file.name),
      );

      remainingFiles.forEach((file) => {
        const index = state.findIndex((f) => f.name === file.name);
        if (index >= 0) {
          state[index].content = '';
          state[index].isModified = false;
        }
      });

      state.splice(0, state.length);
      state.push(...remainingFiles);
    },

    removeAllFiles: (state) => {
      state.splice(0, state.length);
    },
  },
});

export const selectModifiedFiles = createSelector(
  (state: RootState) => state.files,
  (files) => files.filter((file) => !file.isNew),
);

export const {
  addOrUpdateFile,
  renameFile,
  deleteFile,
  removeAllCreationFiles,
  removeAllModifiedFiles,
  removeAllFiles,
} = filesSlice.actions;
export default filesSlice.reducer;
