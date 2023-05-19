import { PreloadedState, combineReducers } from 'redux';
import { configureStore } from '@reduxjs/toolkit';
import menuReducer from './slices/menu.slice';
import authReducer from './slices/auth.slice';

const rootReducer = combineReducers({
  menu: menuReducer,
  auth: authReducer,
});

export const setupStore = (preloadedState?: PreloadedState<RootState>) =>
  configureStore({
    reducer: rootReducer,
    preloadedState,
  });

export type RootState = ReturnType<typeof rootReducer>;
export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = AppStore['dispatch'];
