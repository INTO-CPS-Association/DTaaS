import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface EnvironmentState {
  AUTH_AUTHORITY: string;
}

export const loadInitialEnvironment = (): EnvironmentState => ({
  AUTH_AUTHORITY: globalThis.env.REACT_APP_AUTH_AUTHORITY ?? '',
});

const environmentSlice = createSlice({
  name: 'environment',
  initialState: loadInitialEnvironment(),
  reducers: {
    updateAuthority: (state, action: PayloadAction<string>) => {
      state.AUTH_AUTHORITY = action.payload;
    },
  },
});

export const { updateAuthority } = environmentSlice.actions;
export default environmentSlice.reducer;
