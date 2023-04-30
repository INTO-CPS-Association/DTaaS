import { PayloadAction, createSlice } from '@reduxjs/toolkit';

interface AuthState {
  userName: string | undefined;
  isLoggedIn: boolean;
}

const initState: AuthState = {
  userName: undefined,
  isLoggedIn: localStorage.getItem('isLoggedIn') === 'true',
};

const authSlice = createSlice({
  name: 'auth',
  initialState: initState,
  reducers: {
    setUserName: (
      state: AuthState,
      action: PayloadAction<string | undefined>
    ) => {
      state.userName = action.payload;
    },
    logIn: (state: AuthState) => {
      state.isLoggedIn = true;
      localStorage.setItem('isLoggedIn', 'true');
    },
    logOut: (state: AuthState) => {
      state.isLoggedIn = false;
      localStorage.setItem('isLoggedIn', 'false');
    },
  },
});

export const { setUserName, logIn, logOut } = authSlice.actions;
export default authSlice.reducer;
