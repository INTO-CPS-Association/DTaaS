import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface FileState {
  name: string;
  content: string;
  isNew?: boolean;
  isModified?: boolean;
  type?: string;
}

const initialState: FileState[] = [];

const filesSlice = createSlice({
  name: 'files',
  initialState,
  reducers: {
    addNewFile: (state, action: PayloadAction<{ name: string; type: string }>) => {
      state.push({
        name: action.payload.name, content: '', isNew: true, type: action.payload.type
      });
    },

    addOrUpdateFile: (state, action: PayloadAction<FileState>) => {
      const index = state.findIndex((file) => file.name === action.payload.name);
      if (index >= 0) {
        state[index] = { 
          ...state[index],
          ...action.payload,
          isModified: true
        };
      } else {
        state.push({ ...action.payload, isModified: true });
      }
    },

    renameFile: (state, action: PayloadAction<{ oldName: string; newName: string }>) => {
      const index = state.findIndex((file) => file.name === action.payload.oldName);
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

    saveAllFiles: (state) => {
      const filesToSave = state.filter((file) => file.isModified);
      filesToSave.forEach((file) => {
        const index = state.findIndex((f) => f.name === file.name);
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
    
      const remainingFiles = state.filter(file => protectedFiles.includes(file.name));
    
      remainingFiles.forEach(file => {
        const index = state.findIndex(f => f.name === file.name);
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
    }
    
  },
});

export const { addNewFile, addOrUpdateFile, renameFile, saveAllFiles, deleteFile, removeAllCreationFiles, removeAllFiles } = filesSlice.actions;
export default filesSlice.reducer;
