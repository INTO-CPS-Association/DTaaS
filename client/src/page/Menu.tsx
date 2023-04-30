import * as React from 'react';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import { useDispatch, useSelector } from 'react-redux';
import { closeMenu, openMenu } from 'store/menu.slice';
import { RootState } from 'store/store';
import { AnyAction } from 'redux';
import MenuToolbar from './MenuToolbar';
import DrawerComponent from './DrawerComponent';

const drawerWidth = 240;

const hooks = () => {
  const theme = useTheme();
  const menuState = useSelector((state: RootState) => state.menu);
  const dispatch = useDispatch();
  const [anchorElUser, setAnchorElUser] =
    React.useState<HTMLButtonElement | null>(null);
  return { theme, menuState, dispatch, anchorElUser, setAnchorElUser };
};

const handlers = (
  setAnchorElUser: React.Dispatch<
    React.SetStateAction<HTMLButtonElement | null>
  >,
  dispatch: React.Dispatch<AnyAction>
) => {
  const handleCloseUserMenu = () => setAnchorElUser(null);
  const handleOpenUserMenu = (event: React.MouseEvent<HTMLButtonElement>) =>
    setAnchorElUser(event.currentTarget);
  const handleDrawerOpen = () => dispatch(openMenu());
  const handleDrawerClose = () => dispatch(closeMenu());
  return {
    handleCloseUserMenu,
    handleOpenUserMenu,
    handleDrawerOpen,
    handleDrawerClose,
  };
};

function MiniDrawer() {
  const { theme, menuState, dispatch, anchorElUser, setAnchorElUser } = hooks();
  const {
    handleCloseUserMenu,
    handleOpenUserMenu,
    handleDrawerOpen,
    handleDrawerClose,
  } = handlers(setAnchorElUser, dispatch);
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
