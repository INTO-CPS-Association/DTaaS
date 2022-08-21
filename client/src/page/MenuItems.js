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

const MenuItems = (
    /* jshint ignore:start */
    <React.Fragment>
    <ListItemButton>
      <ListItemIcon>
        <DashboardIcon />
      </ListItemIcon>
      <Link to="/dashboard" style={tolinkStyle}>Dashboard</Link>
    </ListItemButton>
    <ListItemButton>
      <ListItemIcon>
        <ExtensionIcon />
      </ListItemIcon>
      <Link to="/library" style={tolinkStyle}>Library</Link>
    </ListItemButton>
    <ListItemButton>
      <ListItemIcon>
        <PeopleIcon />
      </ListItemIcon>
        <Link to="/digitaltwins" style={tolinkStyle}>Digital Twins</Link>
    </ListItemButton>
    <ListItemButton>
      <ListItemIcon>
        <QuestionMarkIcon />
      </ListItemIcon>
        <Link to="/sanalysis" style={tolinkStyle}>Scenario Analysis</Link>
    </ListItemButton>
    <ListItemButton>
      <ListItemIcon>
        <HistoryIcon />
      </ListItemIcon>
        <Link to="/history" style={tolinkStyle}>History</Link>
    </ListItemButton>
  </React.Fragment>
  /* jshint ignore:end */
);

export default MenuItems;
