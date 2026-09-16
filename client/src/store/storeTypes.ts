import { combineReducers } from 'redux';
import {
  executionHistorySlice,
  digitalTwinSlice,
  libraryConfigFilesSlice,
  assetsSlice,
  environmentSlice,
  fileSlice,
  cartSlice,
} from '@into-cps-association/dt-automation';
import snackbarSlice from 'store/snackbar.slice';
import menuSlice from 'store/menu.slice';
import authSlice from 'store/auth.slice';
import settingsSlice from 'store/settings.slice';
import workbenchSlice from 'store/workbench.slice';

export const rootReducer = combineReducers({
  menu: menuSlice,
  auth: authSlice,
  assets: assetsSlice,
  digitalTwin: digitalTwinSlice,
  environment: environmentSlice,
  snackbar: snackbarSlice,
  files: fileSlice,
  cart: cartSlice,
  libraryConfigFiles: libraryConfigFilesSlice,
  settings: settingsSlice,
  executionHistory: executionHistorySlice,
  workbench: workbenchSlice,
});

export type RootState = ReturnType<typeof rootReducer>;
