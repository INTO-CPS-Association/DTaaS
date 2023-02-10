/*
src: https://mui.com/material-ui/react-tabs/
*/
import * as React from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import TabPanel, { a11yProps } from 'components/TabPanel';

function LibComponents() {
  const [value, setValue] = React.useState(0);

  const handleChange = (event:React.SyntheticEvent<Element, Event>, newValue:number) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label='basic tabs example'
        >
          <Tab label='Functions' {...a11yProps(0)} />
          <Tab label='Models' {...a11yProps(1)} />
          <Tab label='Tools' {...a11yProps(2)} />
          <Tab label='Data' {...a11yProps(3)} />
          <Tab label='Digital Twins' {...a11yProps(4)} />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        A selection of functions useful for composition of digital twins. The
        functions for data processing and analysis scripts can be placed here.
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
  );
}

export default LibComponents;
