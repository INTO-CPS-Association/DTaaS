import { combineReducers } from 'redux';
import { configureStore } from '@reduxjs/toolkit';
import menuSlice from './menu.slice';
import authSlice from './auth.slice';
import digitalTwinSlice from './digitalTwin.slice';
import snackbarSlice from './snackbar.slice';
import assetsSlice from './assets.slice';
import fileSlice from './file.slice';

const rootReducer = combineReducers({
  menu: menuSlice,
  auth: authSlice,
  assets: assetsSlice,
  digitalTwin: digitalTwinSlice,
  snackbar: snackbarSlice,
  files: fileSlice,
});

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['digitalTwin/setDigitalTwin'],
        ignoredPaths: ['digitalTwin.Test Asset', 'payload.digitalTwin'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;

export default store;
