import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ExtensionIcon from '@mui/icons-material/Extension';
import PeopleIcon from '@mui/icons-material/People';
import EngineeringIcon from '@mui/icons-material/Engineering';
import { Link } from 'react-router-dom';

const tolinkStyle = {
  margin: '0px 0px 0px',
  textDecoration: 'none',
  color: 'rgb(25, 118, 210)',
  fontWeight: 'bold',
};

interface MenuItemEntry {
  index: number;
  name: string;
  icon: React.ReactElement;
  link: string;
}

const menuItems: MenuItemEntry[] = [
  { index: 1, name: 'Library', icon: <ExtensionIcon />, link: '/library' },
  {
    index: 2,
    name: 'Digital Twins',
    icon: <PeopleIcon />,
    link: '/digitaltwins',
  },
  {
    index: 5,
    name: 'Workbench',
    icon: <EngineeringIcon />,
    link: '/workbench',
  },
];

function MenuItem({
  item,
  open,
}: Readonly<{ item: MenuItemEntry; open: boolean }>) {
  const isActive = globalThis.location.pathname === item.link;
  return (
    <Link to={item.link} style={tolinkStyle}>
      <ListItemButton
        sx={{ justifyContent: open ? 'initial' : 'center', px: 2.5 }}
        style={isActive ? { backgroundColor: 'lightgray' } : undefined}
        data-logger-element="nav-link"
        data-logger-label={item.name}
        data-logger-context={JSON.stringify({
          nav: { link: item.link, active: isActive },
        })}
      >
        <ListItemIcon
          sx={{
            minWidth: 0,
            mr: open ? 3 : 'auto',
            justifyContent: 'center',
          }}
        >
          {item.icon}
        </ListItemIcon>
        <ListItemText primary={item.name} sx={{ opacity: open ? 1 : 0 }} />
      </ListItemButton>
    </Link>
  );
}

function MenuItems({ open }: Readonly<{ open: boolean }>) {
  return (
    <>
      {menuItems.map((item) => (
        <MenuItem key={item.index} item={item} open={open} />
      ))}
    </>
  );
}

export default MenuItems;
