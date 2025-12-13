import { styled, Theme, CSSObject } from '@mui/material/styles';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import IconButton from '@mui/material/IconButton';

const drawerHeaderMixin = (theme: Theme): CSSObject => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
});

const DrawerHeader = styled('div')(({ theme }) => ({
  ...drawerHeaderMixin(theme),
}));

type DrawerHeaderProps = {
  handleDrawerClose: () => void;
  theme: Theme;
};

function DrawerHeaderComponent({
  handleDrawerClose,
  theme,
}: DrawerHeaderProps) {
  return (
    <DrawerHeader>
      <IconButton onClick={handleDrawerClose}>
        {theme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
      </IconButton>
    </DrawerHeader>
  );
}

export default DrawerHeaderComponent;
