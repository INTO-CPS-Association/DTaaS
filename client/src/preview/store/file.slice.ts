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

    /* addOrUpdateNewDTFile: (state, action: PayloadAction<FileState>) => {
      const index = state.findIndex((file) => file.name === action.payload.name);
      if (index >= 0) {
        state[index] = { ...action.payload, isModified: true };
      } else {
        state.push({ ...action.payload, isModified: true });
      }
    },
    */

    addOrUpdateFile: (state, action: PayloadAction<FileState>) => {
      const index = state.findIndex((file) => file.name === action.payload.name);
      if (index >= 0) {
        // Mantieni il tipo esistente se presente
        state[index] = { 
          ...state[index], // Mantieni il file esistente
          ...action.payload, // Aggiorna solo le proprietà di action.payload
          isModified: true // Segna come modificato
        };
      } else {
        state.push({ ...action.payload, isModified: true });
      }
    },

    renameFile: (state, action: PayloadAction<{ oldName: string; newName: string }>) => {
      const index = state.findIndex((file) => file.name === action.payload.oldName);
      if (index >= 0) {
        // Update the file name
        state[index].name = action.payload.newName;
        state[index].isModified = true; // Mark as modified
        
        // Determine the new type based on the new name's extension
        const extension = action.payload.newName.split('.').pop();
        if (extension === 'md') {
          state[index].type = 'description';
        } else if (['json', 'yaml', 'yml'].includes(extension!)) {
          state[index].type = 'configuration';
        } else {
          state[index].type = 'lifecycle'; // Default case for other extensions
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
        state.splice(index, 1); // Rimuove il file dal state
      }
    },    

    removeAllCreationFiles: (state) => {
      const protectedFiles = ['description.md', 'README.md', '.gitlab-ci.yml'];
    
      // Mantieni solo i file protetti
      const remainingFiles = state.filter(file => protectedFiles.includes(file.name));
    
      // Reimposta il contenuto dei file rimanenti a vuoto
      remainingFiles.forEach(file => {
        const index = state.findIndex(f => f.name === file.name);
        if (index >= 0) {
          state[index].content = ''; // Reimposta il contenuto a vuoto
          state[index].isModified = false; // Imposta isModified a false
        }
      });
    
      // Rimuovi tutti i file non protetti
      state.splice(0, state.length); // Elimina tutti i file
      state.push(...remainingFiles); // Aggiungi i file protetti vuoti
    },
    
    removeAllFiles: (state) => {
      state.splice(0, state.length); // Rimuovi tutti i file dallo stato
    }
    
  },
});

export const { addNewFile, addOrUpdateFile, renameFile, saveAllFiles, deleteFile, removeAllCreationFiles, removeAllFiles } = filesSlice.actions;
export default filesSlice.reducer;
