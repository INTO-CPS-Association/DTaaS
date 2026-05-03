import { combineReducers } from 'redux';
import executionHistorySlice from 'model/backend/state/executionHistory.slice';
import digitalTwinSlice from 'model/backend/state/digitalTwin.slice';
import libraryConfigFilesSlice from 'model/store/libraryConfigFiles.slice';
import snackbarSlice from 'store/snackbar.slice';
import assetsSlice from 'model/store/assets.slice';
import fileSlice from 'model/store/file.slice';
import cartSlice from 'model/store/cart.slice';
import menuSlice from 'store/menu.slice';
import authSlice from 'store/auth.slice';
import settingsSlice from 'store/settings.slice';
import workbenchSlice from 'store/workbench.slice';

export const rootReducer = combineReducers({
  menu: menuSlice,
  auth: authSlice,
  assets: assetsSlice,
  digitalTwin: digitalTwinSlice,
  snackbar: snackbarSlice,
  files: fileSlice,
  cart: cartSlice,
  libraryConfigFiles: libraryConfigFilesSlice,
  settings: settingsSlice,
  executionHistory: executionHistorySlice,
  workbench: workbenchSlice,
});

export type RootState = ReturnType<typeof rootReducer>;
