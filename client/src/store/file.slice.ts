import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from './store';

export interface FileState {
  name: string;
  content: string;
  isModified: boolean;
}

const initialState: FileState[] = [];

const filesSlice = createSlice({
  name: 'files',
  initialState,
  reducers: {
    addOrUpdateFile: (state, action: PayloadAction<FileState>) => {
      const index = state.findIndex(
        (file) => file.name === action.payload.name,
      );
      if (index >= 0) {
        state[index] = { ...action.payload, isModified: true };
      } else {
        state.push({ ...action.payload, isModified: true });
      }
    },

    saveAllFiles: (state) => {
      const filesToSave = state.filter((file) => file.isModified);
      filesToSave.forEach((file) => {
        const index = state.findIndex((f) => f.name === file.name);
        if (index >= 0) {
          state.splice(index, 1);
        }
      });
    },
  },
});

export const findFileByName = (name: string) => (state: RootState) =>
  state.files.find((file) => file.name === name);

export const getModifiedFiles = (state: RootState) =>
  state.files.filter((file) => file.isModified);

export const { addOrUpdateFile, saveAllFiles } = filesSlice.actions;
export default filesSlice.reducer;
