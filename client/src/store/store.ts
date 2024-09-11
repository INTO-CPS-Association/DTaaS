import { combineReducers } from 'redux';
import { configureStore } from '@reduxjs/toolkit';
import menuSlice from './menu.slice';
import authSlice from './auth.slice';
import cartReducer from './cart.slice';
import digitalTwinSlice from './digitalTwin.slice';
import snackbarSlice from './snackbar.slice';
import assetsSlice from './assets.slice';

const rootReducer = combineReducers({
  menu: menuSlice,
  auth: authSlice,
  cart: cartReducer,
  digitalTwin: digitalTwinSlice,
  snackbar: snackbarSlice,
  assets: assetsSlice,
});

const store = configureStore({
  reducer: rootReducer,
});

export type RootState = ReturnType<typeof store.getState>;

export default store;
