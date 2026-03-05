import { combineReducers, Middleware } from 'redux';
import { configureStore } from '@reduxjs/toolkit';
import executionHistorySlice, {
  setStorageService,
} from 'model/backend/state/executionHistory.slice';
import digitalTwinSlice from 'model/backend/state/digitalTwin.slice';
import libraryConfigFilesSlice from 'model/store/libraryConfigFiles.slice';
import snackbarSlice from 'store/snackbar.slice';
import assetsSlice from 'model/store/assets.slice';
import fileSlice from 'model/store/file.slice';
import cartSlice from 'model/store/cart.slice';
import menuSlice from 'store/menu.slice';
import authSlice from 'store/auth.slice';
import settingsSlice from 'store/settings.slice';
import indexedDBService from 'database/executionHistoryDB';

setStorageService(indexedDBService);

const loadSettings = () => {
  const serializedSettings = localStorage.getItem('settings');
  return serializedSettings ? JSON.parse(serializedSettings) : undefined;
};

const rootReducer = combineReducers({
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
});

const settingsPersistMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);

  if (
    action &&
    typeof action === 'object' &&
    'type' in action &&
    typeof action.type === 'string' &&
    action.type.startsWith('settings/')
  ) {
    const state = store.getState();
    localStorage.setItem('settings', JSON.stringify(state.settings));
  }

  return result;
};

const store = configureStore({
  reducer: rootReducer,
  preloadedState: { settings: loadSettings() },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'digitalTwin/setDigitalTwin',
          'assets/setAsset',
          'assets/deleteAsset',
        ],
        ignoredPaths: ['digitalTwin.digitalTwin', 'assets.items'], // Suppress non-serializable check for GitlabAPI
      },
    }).concat(settingsPersistMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;

export default store;
