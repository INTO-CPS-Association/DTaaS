import { combineReducers } from 'redux';
import { configureStore } from '@reduxjs/toolkit';
import menuSlice from './menu.slice';
import authSlice from './auth.slice';
import digitalTwinSlice from './digitalTwin.slice';

const rootReducer = combineReducers({
  menu: menuSlice,
  auth: authSlice,
  digitalTwin: digitalTwinSlice,
});

const store = configureStore({
  reducer: rootReducer,
});

export type RootState = ReturnType<typeof store.getState>;
export default store;
