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
import { useAuth } from 'react-oidc-context';
import LinkButtons from 'components/LinkButtons';
import toolbarLinkValues from 'util/toolbarUtil';
import { useSignOut } from 'util/auth/Authentication';

interface AppBarProps extends MuiAppBarProps {
  open?: boolean;
  drawerwidth: number;
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
})<AppBarProps>(({ theme, open, drawerwidth }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: transition({ theme, open }),
  ...(open && {
    marginLeft: drawerwidth,
    width: `calc(100% - ${drawerwidth}px)`,
    transition: transition({ theme, open }),
  }),
}));

interface MenuToolbarProps {
  open: boolean;
  handleDrawerOpen: () => void;
  handleOpenUserMenu: (event: React.MouseEvent<HTMLButtonElement>) => void;
  handleCloseUserMenu: () => void;
  drawerwidth: number;
  anchorElUser: HTMLElement | null;
}

function MenuToolbar({
  open,
  drawerwidth,
  handleCloseUserMenu,
  handleOpenUserMenu,
  handleDrawerOpen,
  anchorElUser,
}: MenuToolbarProps) {
  const auth = useAuth();
  const root = document.getElementById('root');
  const signOut = useSignOut();

  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
    }
  };
  return (
    <AppBar position="fixed" open={open} drawerwidth={drawerwidth}>
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

        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 0 }}>
          <LinkButtons buttons={toolbarLinkValues} size={2.5} />
          <Tooltip title="Open settings" PopperProps={{ container: root }}>
            <IconButton onClick={handleOpenUserMenu}>
              <Avatar sx={{ bgcolor: deepPurple[500] }}>A</Avatar>
            </IconButton>
          </Tooltip>
          <Menu
            sx={{ mt: '45px' }}
            id="menu-appbar"
            anchorEl={anchorElUser}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            keepMounted
            container={root}
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
            <MenuItem component={Link} to="/" onClick={handleSignOut}>
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
