import * as React from 'react';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import useAppState from 'store/AppAccess';
import MenuToolbar from './MenuToolbar';
import DrawerComponent from './DrawerComponent';

const drawerwidth = 240;

const hooks = () => {
  const theme = useTheme();
  const { state: menuState, actions: menuAction } = useAppState();
  const [anchorElUser, setAnchorElUser] =
    React.useState<HTMLButtonElement | null>(null);
  return { theme, menuState, menuAction, anchorElUser, setAnchorElUser };
};

function MiniDrawer() {
  const { theme, menuState, menuAction, anchorElUser, setAnchorElUser } =
    hooks();
  const handleCloseUserMenu = () => setAnchorElUser(null);
  const handleOpenUserMenu = (event: React.MouseEvent<HTMLButtonElement>) =>
    setAnchorElUser(event.currentTarget);
  const handleDrawerOpen = () => menuAction.open();
  const handleDrawerClose = () => menuAction.close();
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
