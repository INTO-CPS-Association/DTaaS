import * as React from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import TabPanel, { a11yProps } from 'components/TabPanel';

function AccountTabs() {
  const [value, setValue] = React.useState<number>(0);

  const handleChange = (event: React.SyntheticEvent<Element, Event>, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="basic tabs example"
        >
          <Tab label="Profile" {...a11yProps(0)} />
          <Tab label="Settings" {...a11yProps(1)} />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        Profile - potentially visible to other users
      </TabPanel>
      <TabPanel value={value} index={1}>
        Account settings - private to a user
      </TabPanel>
    </Box>
  );
}

export default AccountTabs;
