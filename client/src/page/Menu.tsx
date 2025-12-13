import React, { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import { useDispatch, useSelector } from 'react-redux';
import { closeMenu, openMenu } from 'store/menu.slice';
import { RootState } from 'store/store';
import MenuToolbar from 'page/MenuToolbar';
import DrawerComponent from 'page/DrawerComponent';

const drawerwidth = 240;

const useSetupMiniDrawer = () => {
  const theme = useTheme();
  const menuState = useSelector((state: RootState) => state.menu);
  const dispatch = useDispatch();
  const [anchorElUser, setAnchorElUser] = useState<HTMLButtonElement | null>(
    null,
  );
  return { theme, menuState, dispatch, anchorElUser, setAnchorElUser };
};

function MiniDrawer() {
  const { theme, menuState, dispatch, anchorElUser, setAnchorElUser } =
    useSetupMiniDrawer();
  const handleCloseUserMenu = () => setAnchorElUser(null);
  const handleOpenUserMenu = (event: React.MouseEvent<HTMLButtonElement>) =>
    setAnchorElUser(event.currentTarget);
  const handleDrawerOpen = () => dispatch(openMenu());
  const handleDrawerClose = () => dispatch(closeMenu());
  return (
    <Box sx={{ display: 'flex' }}>
      <MenuToolbar
        open={menuState.isOpen}
        drawerwidth={drawerwidth}
        handleCloseUserMenu={handleCloseUserMenu}
        handleDrawerOpen={handleDrawerOpen}
        handleOpenUserMenu={handleOpenUserMenu}
        anchorElUser={anchorElUser}
      />
      <DrawerComponent
        open={menuState.isOpen}
        theme={theme}
        handleDrawerClose={handleDrawerClose}
      />
    </Box>
  );
}

export default MiniDrawer;
