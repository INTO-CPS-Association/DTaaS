import { combineReducers } from 'redux';
import { configureStore } from '@reduxjs/toolkit';
import digitalTwinSlice from 'preview/store/digitalTwin.slice';
import snackbarSlice from 'preview/store/snackbar.slice';
import assetsSlice from 'preview/store/assets.slice';
import menuSlice from './menu.slice';
import authSlice from './auth.slice';

const rootReducer = combineReducers({
  menu: menuSlice,
  auth: authSlice,
  assets: assetsSlice,
  digitalTwin: digitalTwinSlice,
  snackbar: snackbarSlice,
});

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['digitalTwin/setDigitalTwin'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;

export default store;
