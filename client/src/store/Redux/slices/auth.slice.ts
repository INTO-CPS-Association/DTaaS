import { PayloadAction, createSlice } from '@reduxjs/toolkit';

interface AuthState {
  userName: string | undefined;
}

const initState: AuthState = {
  userName: undefined,
};

const authSlice = createSlice({
  name: 'auth',
  initialState: initState,
  reducers: {
    setUserName: (state: AuthState, action: PayloadAction<string>) => {
      state.userName = action.payload;
    },
    clearUser: (state: AuthState) => {
      state.userName = undefined;
    }
  },
});

export const { setUserName, clearUser } = authSlice.actions;
export default authSlice.reducer;
