import * as React from 'react';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import MenuToolbar from './MenuToolbar';
import DrawerComponent from './DrawerComponent';

const drawerWidth = 240;

function MiniDrawer() {
  const theme = useTheme();
  const [open, setOpen] = React.useState<boolean>(false);
  const [anchorElUser, setAnchorElUser] =
    React.useState<HTMLButtonElement | null>(null);

  const handleCloseUserMenu = () => setAnchorElUser(null);
  const handleOpenUserMenu = (event: React.MouseEvent<HTMLButtonElement>) =>
    setAnchorElUser(event.currentTarget);
  const handleDrawerOpen = () => setOpen(true);
  const handleDrawerClose = () => setOpen(false);

  return (
    <Box sx={{ display: 'flex' }}>
      <MenuToolbar
        open={open}
        drawerWidth={drawerWidth}
        handleCloseUserMenu={handleCloseUserMenu}
        handleDrawerOpen={handleDrawerOpen}
        handleOpenUserMenu={handleOpenUserMenu}
        anchorElUser={anchorElUser}
      />
      <DrawerComponent
        open={open}
        theme={theme}
        handleDrawerClose={handleDrawerClose}
      />
    </Box>
  );
}

export default MiniDrawer;
