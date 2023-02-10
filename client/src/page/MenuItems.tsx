import * as React from 'react';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ExtensionIcon from '@mui/icons-material/Extension';
import PeopleIcon from '@mui/icons-material/People';
import HistoryIcon from '@mui/icons-material/History';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import { Link } from 'react-router-dom';

const tolinkStyle = {
  margin: '0px 0px 0px',
  textDecoration: 'none',
  color: 'rgb(25, 118, 210)',
  fontWeight: 'bold',
};

function MenuItems() {
  return (
  <>
    <Link to='/dashboard' style={tolinkStyle}>
      <ListItemButton>
        <ListItemIcon>
          <DashboardIcon />
        </ListItemIcon>
        Dashboard
      </ListItemButton>
    </Link>
    <Link to='/library' style={tolinkStyle}>
      <ListItemButton>
        <ListItemIcon>
          <ExtensionIcon />
        </ListItemIcon>
        Library
      </ListItemButton>
    </Link>
    <Link to='/digitaltwins' style={tolinkStyle}>
      <ListItemButton>
        <ListItemIcon>
          <PeopleIcon />
        </ListItemIcon>
        Digital Twins
      </ListItemButton>
    </Link>
    <Link to='/sanalysis' style={tolinkStyle}>
      <ListItemButton>
        <ListItemIcon>
          <QuestionMarkIcon />
        </ListItemIcon>
        Scenario Analysis
      </ListItemButton>
    </Link>
    <Link to='/history' style={tolinkStyle}>
      <ListItemButton>
        <ListItemIcon>
          <HistoryIcon />
        </ListItemIcon>
        History
      </ListItemButton>
    </Link>
  </>
  );
}

export default MenuItems;
