/*
src: https://mui.com/material-ui/react-tabs/
*/
import * as React from 'react';
import PropTypes from 'prop-types';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

function TabPanel(props) {
  const {
    children, value, index, ...other
  } = props;

  return (
    /* jshint ignore:start */
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
    /* jshint ignore:end */
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

export default function LibComponents() {
  const [value, setValue] = React.useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    /* jshint ignore:start */
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="basic tabs example">
          <Tab label="Functions" {...a11yProps(0)} />
          <Tab label="Models" {...a11yProps(1)} />
          <Tab label="Tools" {...a11yProps(2)} />
          <Tab label="Data" {...a11yProps(3)} />
          <Tab label="Digital Twins" {...a11yProps(4)} />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        A selection of functions useful for composition of digital twins.
        The functions for data processing and analysis scripts can be placed here.
      </TabPanel>
      <TabPanel value={value} index={1}>
          Digital twin models
      </TabPanel>
      <TabPanel value={value} index={2}>
          Digital twin execution software
      </TabPanel>
      <TabPanel value={value} index={3}>
          Data sources for execution of digital twins
      </TabPanel>
      <TabPanel value={value} index={4}>
          Ready to use digital twins
      </TabPanel>
    </Box>
    /* jshint ignore:end */
  );
}
