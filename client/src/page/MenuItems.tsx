import * as React from 'react';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ExtensionIcon from '@mui/icons-material/Extension';
import PeopleIcon from '@mui/icons-material/People';
import HistoryIcon from '@mui/icons-material/History';
import EngineeringIcon from '@mui/icons-material/Engineering';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
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
  icon: JSX.Element;
  link: string;
}

const menuItems: MenuItemEntry[] = [
  { index: 0, name: 'Dashboard', icon: <DashboardIcon />, link: '/dashboard' },
  { index: 1, name: 'Library', icon: <ExtensionIcon />, link: '/library' },
  {
    index: 2,
    name: 'Digital Twins',
    icon: <PeopleIcon />,
    link: '/digitaltwins',
  },
  {
    index: 3,
    name: 'Scenario Analysis',
    icon: <QuestionMarkIcon />,
    link: '/sanalysis',
  },
  { index: 4, name: 'History', icon: <HistoryIcon />, link: '/history' },
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
          <ListItemButton>
            <ListItemIcon>{item.icon}</ListItemIcon>
            {item.name}
          </ListItemButton>
        </Link>
      ))}
    </>
  );
}

export default MenuItems;
