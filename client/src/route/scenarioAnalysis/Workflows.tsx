import * as React from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import TabPanel, { a11yProps } from 'components/TabPanel';

function Workflows() {
  const [value, setValue] = React.useState(0);

  const handleChange = (event: React.SyntheticEvent<Element, Event>, newValue: number) => {
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
          <Tab label='Define' {...a11yProps(0)} />
          <Tab label='Execute' {...a11yProps(1)} />
          <Tab label='Analyze' {...a11yProps(2)} />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        Create multiple scenarios and potentially select the execution
        infrastructure
      </TabPanel>
      <TabPanel value={value} index={1}>
        Execution of scenarios and potential real-time interaction
      </TabPanel>
      <TabPanel value={value} index={2}>
        Execution summary, output data in text and graphical formats
      </TabPanel>
    </Box>
  );
}

export default Workflows;
