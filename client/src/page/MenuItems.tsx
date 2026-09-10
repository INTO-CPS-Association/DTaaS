import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Tooltip from '@mui/material/Tooltip';
import {
  LibraryIcon,
  DigitalTwinsIcon,
  WorkbenchIcon,
} from 'components/appIcons';
import { Link, useLocation } from 'react-router-dom';

interface MenuItemEntry {
  index: number;
  name: string;
  icon: React.ReactElement;
  link: string;
}

const menuItems: MenuItemEntry[] = [
  { index: 1, name: 'Library', icon: <LibraryIcon />, link: '/library' },
  {
    index: 2,
    name: 'Digital Twins',
    icon: <DigitalTwinsIcon />,
    link: '/digitaltwins',
  },
  {
    index: 5,
    name: 'Workbench',
    icon: <WorkbenchIcon />,
    link: '/workbench',
  },
];

/**
 * The navigation items of the drawer.
 *
 * The active item is decided from the router, not from `globalThis.location`,
 * so it is still correct when the application is served under a base path.
 *
 * When the drawer is collapsed to its rail the labels are clipped, so each
 * item carries a tooltip. The label stays in the document either way, which is
 * what a screen reader announces.
 */
function MenuItems({ open }: Readonly<{ open: boolean }>) {
  const { pathname } = useLocation();

  return (
    <>
      {menuItems.map((item) => {
        const selected = pathname === item.link;
        return (
          <Tooltip
            key={item.index}
            title={item.name}
            placement="right"
            disableHoverListener={open}
            disableFocusListener={open}
            disableTouchListener={open}
          >
            <ListItemButton
              component={Link}
              to={item.link}
              selected={selected}
              aria-current={selected ? 'page' : undefined}
              sx={{ mx: 1, my: 0.25, color: 'text.primary' }}
              data-logger-element="nav-link"
              data-logger-label={item.name}
              data-logger-context={JSON.stringify({
                nav: { link: item.link, active: selected },
              })}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.name}
                slotProps={{
                  primary: {
                    variant: 'body2',
                    noWrap: true,
                    sx: { fontWeight: selected ? 700 : 500 },
                  },
                }}
              />
            </ListItemButton>
          </Tooltip>
        );
      })}
    </>
  );
}

export default MenuItems;
