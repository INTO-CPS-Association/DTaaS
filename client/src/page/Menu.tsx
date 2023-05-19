import * as React from 'react';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import { useAppDispatch, useAppSelector } from 'store/Redux/hooks';
import { closeMenu, openMenu } from 'store/Redux/slices/menu.slice';
import MenuToolbar from './MenuToolbar';
import DrawerComponent from './DrawerComponent';

const drawerWidth = 240;

const hooks = () => {
  const theme = useTheme();
  const menuState = useAppSelector((state) => state.menu);
  const dispatch = useAppDispatch();
  const [anchorElUser, setAnchorElUser] =
    React.useState<HTMLButtonElement | null>(null);
  return { theme, menuState, dispatch, anchorElUser, setAnchorElUser };
};

function MiniDrawer() {
  const { theme, menuState, dispatch, anchorElUser, setAnchorElUser } = hooks();
  const handleCloseUserMenu = () => setAnchorElUser(null);
  const handleOpenUserMenu = (event: React.MouseEvent<HTMLButtonElement>) =>
    setAnchorElUser(event.currentTarget);
  const handleDrawerOpen = () => dispatch(openMenu());
  const handleDrawerClose = () => dispatch(closeMenu());
  return (
    <Box sx={{ display: 'flex' }}>
      <MenuToolbar
        open={menuState.isOpen}
        drawerWidth={drawerWidth}
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
