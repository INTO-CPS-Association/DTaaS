import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Tooltip from '@mui/material/Tooltip';
import {
  LibraryIcon,
  DigitalTwinsIcon,
  AutomationIcon,
  WorkbenchIcon,
  BuildingModelsIcon,
  InsightsIcon,
} from 'components/appIcons';
import { Link, useLocation } from 'react-router-dom';
import { Feature, Profile, getProfile, isFeatureEnabled } from 'util/profile';

interface MenuItemEntry {
  index: number;
  feature: Feature;
  name: string;
  icon: React.ReactElement;
  link: string;
}

const menuItems: MenuItemEntry[] = [
  {
    index: 1,
    feature: 'library',
    name: 'Library',
    icon: <LibraryIcon />,
    link: '/library',
  },
  {
    index: 2,
    feature: 'digitaltwins',
    name: 'Digital Twins',
    icon: <DigitalTwinsIcon />,
    link: '/digitaltwins',
  },
  {
    index: 3,
    feature: 'automation',
    name: 'Automation',
    icon: <AutomationIcon />,
    link: '/automation',
  },
  {
    index: 4,
    feature: 'bim',
    name: 'Buildings',
    icon: <BuildingModelsIcon />,
    link: '/bim',
  },
  {
    index: 5,
    feature: 'workbench',
    name: 'Workbench',
    icon: <WorkbenchIcon />,
    link: '/workbench',
  },
  {
    index: 6,
    feature: 'insights',
    name: 'Insights',
    icon: <InsightsIcon />,
    link: '/insights',
  },
];

/** The drawer entries a profile offers, in their agreed order. */
export function menuItemsFor(profile: Profile): MenuItemEntry[] {
  return menuItems.filter(({ feature }) => isFeatureEnabled(feature, profile));
}

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
      {menuItemsFor(getProfile()).map((item) => {
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
