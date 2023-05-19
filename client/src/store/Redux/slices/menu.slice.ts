import { createSlice } from '@reduxjs/toolkit';

interface MenuState {
  isOpen: boolean;
}

const initState: MenuState = {
  isOpen: false,
};

const menuSlice = createSlice({
  name: 'menu',
  initialState: initState,
  reducers: {
    openMenu: (state: MenuState) => {
      state.isOpen = true;
    },
    closeMenu: (state: MenuState) => {
      state.isOpen = false;
    },
  },
});

export const { openMenu, closeMenu } = menuSlice.actions;
export default menuSlice.reducer;
