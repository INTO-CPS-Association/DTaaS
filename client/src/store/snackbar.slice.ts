import { AlertColor } from '@mui/material';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ShowNotificationPayload } from 'model/backend/interfaces/sharedInterfaces';

const MAX_SNACKBARS = 3;

export interface SnackbarItem {
  id: number;
  message: string;
  severity: AlertColor;
  icon?: string;
}

export interface SnackbarState {
  items: SnackbarItem[];
  nextId: number;
}

const initialState: SnackbarState = {
  items: [],
  nextId: 0,
};

const snackbarSlice = createSlice({
  name: 'snackbar',
  initialState,
  reducers: {
    showSnackbar(state, action: PayloadAction<ShowNotificationPayload>) {
      const item: SnackbarItem = {
        id: state.nextId,
        message: action.payload.message,
        severity: action.payload.severity as AlertColor,
        icon: action.payload.icon,
      };
      state.nextId += 1;
      state.items.push(item);
      if (state.items.length > MAX_SNACKBARS) {
        state.items.shift();
      }
    },
    hideSnackbar(state, action: PayloadAction<number | undefined>) {
      if (action.payload === undefined) {
        state.items = [];
      } else {
        state.items = state.items.filter((item) => item.id !== action.payload);
      }
    },
  },
});

export const { showSnackbar, hideSnackbar } = snackbarSlice.actions;
export default snackbarSlice.reducer;
