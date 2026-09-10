import Toolbar from '@mui/material/Toolbar';
import MenuIcon from '@mui/icons-material/Menu';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { Link } from 'react-router-dom';
import {
  Avatar,
  Divider,
  ListItemIcon,
  styled,
  Theme,
  Tooltip,
} from '@mui/material';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import MuiAppBar, { AppBarProps as MuiAppBarProps } from '@mui/material/AppBar';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import { useAuth } from 'react-oidc-context';
import LinkButtons from 'components/LinkButtons';
import AppTitle from 'components/AppTitle';
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
      {/* Relative, because the title is centred over the bar instead of
          laid out between the two groups of controls. */}
      {/* Three columns, the outer two equal, so the title is centred on the
          bar whatever the sides hold. The left cell stays even when the drawer
          button is hidden, which is what keeps the middle cell in the middle. */}
      <Toolbar
        sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 1 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            data-logger-element="button"
            data-logger-label="Open Drawer"
            sx={{ ...(open && { display: 'none' }) }}
          >
            <MenuIcon />
          </IconButton>
        </Box>

        <AppTitle />

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            justifySelf: 'end',
          }}
        >
          {/* The external links are secondary, and on a phone the name of the
              product matters more than a shortcut to the repository. */}
          <Box
            sx={{
              display: { xs: 'none', sm: 'flex' },
              alignItems: 'center',
              color: 'text.secondary',
            }}
          >
            <LinkButtons buttons={toolbarLinkValues} size={1.5} />
          </Box>
          <Tooltip
            title="Open settings"
            slotProps={{ popper: { container: root } }}
          >
            <IconButton
              onClick={handleOpenUserMenu}
              data-logger-element="button"
              data-logger-label="Open Settings"
              sx={{
                ml: 0.5,
                p: 0.5,
                border: 'none',
                backgroundColor: 'transparent',
                width: 'auto',
                height: 'auto',
              }}
            >
              <Avatar sx={{ width: 32, height: 32 }}>A</Avatar>
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
            slotProps={{ list: { sx: { minWidth: 180 } } }}
          >
            <MenuItem
              component={Link}
              to="/account"
              onClick={handleCloseUserMenu}
              data-logger-element="nav-link"
              data-logger-label="Account"
            >
              <ListItemIcon>
                <PersonRoundedIcon fontSize="small" />
              </ListItemIcon>
              Account
            </MenuItem>
            <Divider />
            <MenuItem
              component={Link}
              to="/"
              onClick={handleSignOut}
              data-logger-element="button"
              data-logger-label="Logout"
            >
              <ListItemIcon>
                <LogoutRoundedIcon fontSize="small" />
              </ListItemIcon>
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
