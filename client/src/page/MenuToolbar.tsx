import * as React from 'react';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import MenuIcon from '@mui/icons-material/Menu';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { Link } from 'react-router-dom';
import { Avatar, styled, Theme, Tooltip } from '@mui/material';
import { deepPurple } from '@mui/material/colors';
import MuiAppBar, { AppBarProps as MuiAppBarProps } from '@mui/material/AppBar';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import { useAuth } from 'components/AuthContext';

interface AppBarProps extends MuiAppBarProps {
  open?: boolean;
  drawerWidth: number;
}

const transition = ({
  theme,
  open,
}: {
  theme: Theme;
  open: boolean | undefined;
}) =>
  theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: open
      ? theme.transitions.duration.enteringScreen
      : theme.transitions.duration.leavingScreen,
  });

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})<AppBarProps>(({ theme, open, drawerWidth }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: transition({ theme, open }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: transition({ theme, open }),
  }),
}));

interface MenuToolbarProps {
  open: boolean;
  handleDrawerOpen: () => void;
  handleOpenUserMenu: (event: React.MouseEvent<HTMLButtonElement>) => void;
  handleCloseUserMenu: () => void;
  drawerWidth: number;
  anchorElUser: HTMLElement | null;
}

function MenuToolbar({
  open,
  drawerWidth,
  handleCloseUserMenu,
  handleOpenUserMenu,
  handleDrawerOpen,
  anchorElUser,
}: MenuToolbarProps) {
  const { logOut } = useAuth();
  return (
    <AppBar position="fixed" open={open} drawerWidth={drawerWidth}>
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          onClick={handleDrawerOpen}
          edge="start"
          sx={{
            marginRight: 5,
            ...(open && { display: 'none' }),
          }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" noWrap component="div">
          The Digital Twin as a Service
        </Typography>

        <Box sx={{ flexGrow: 0 }}>
          <Tooltip title="Open settings">
            <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
              <Avatar sx={{ bgcolor: deepPurple[500] }}>A</Avatar>
            </IconButton>
          </Tooltip>
          <Menu
            sx={{ mt: '45px' }}
            id="menu-appbar"
            anchorEl={anchorElUser}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            keepMounted
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            open={Boolean(anchorElUser)}
            onClose={handleCloseUserMenu}
          >
            <MenuItem
              component={Link}
              to="/account"
              onClick={handleCloseUserMenu}
            >
              Account
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleCloseUserMenu();
                logOut();
              }}
            >
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default MenuToolbar;
export { transition };
