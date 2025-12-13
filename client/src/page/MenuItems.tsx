import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
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

function MenuItems() {
  return (
    <>
      {menuItems.map((item) => (
        <Link to={item.link} style={tolinkStyle} key={item.index}>
          <ListItemButton
            style={
              window.location.pathname === item.link
                ? { backgroundColor: 'lightgray' }
                : undefined
            }
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            {item.name}
          </ListItemButton>
        </Link>
      ))}
    </>
  );
}

export default MenuItems;
