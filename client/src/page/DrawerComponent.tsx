import { styled, Theme, CSSObject } from '@mui/material/styles';
import MuiDrawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import Divider from '@mui/material/Divider';
import { transition } from 'page/MenuToolbar';
import MenuItems from 'page/MenuItems';
import DrawerHeaderComponent from 'page/DrawerHeaderComponent';

const drawerwidth = 240;

const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerwidth,
  transition: transition({ theme, open: true }),
  overflowX: 'hidden',
});

const closedMixin = (theme: Theme): CSSObject => ({
  transition: transition({ theme, open: false }),
  overflowX: 'hidden',
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  width: drawerwidth,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  ...(open && {
    ...openedMixin(theme),
    '& .MuiDrawer-paper': openedMixin(theme),
  }),
  ...(!open && {
    ...closedMixin(theme),
    '& .MuiDrawer-paper': closedMixin(theme),
  }),
}));

function DrawerComponent({
  open,
  theme,
  handleDrawerClose,
}: {
  open: boolean;
  theme: Theme;
  handleDrawerClose: () => void;
}) {
  return (
    <Drawer variant="permanent" open={open}>
      <DrawerHeaderComponent
        handleDrawerClose={handleDrawerClose}
        theme={theme}
      />
      <Divider />
      <List>
        <MenuItems />
      </List>
    </Drawer>
  );
}

export default DrawerComponent;
