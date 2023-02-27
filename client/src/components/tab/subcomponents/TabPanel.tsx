import { Box, Typography } from '@mui/material';
import { TabData } from 'components/tab/TabComponent';
import React from 'react';

interface TabPanelProps {
  children: TabData;
  active?: boolean;
}

function TabPanel(props: TabPanelProps) {
  const { children: tab, active } = props;
  
  return (
    <Box
      role="tabpanel"
      display={active ? 'block' : 'none'}
      id={`simple-tabpanel-${tab.index}`}
      aria-labelledby={`simple-tab-${tab.index}`}
      sx={{
        p: 2,
        ...(tab.fullsize && active
          ? { display: 'flex', flexDirection: 'column', flexGrow: 1 }
          : { minHeight: '100%' }),
      }}
    >
      <Typography
        sx={
          tab.fullsize && active
            ? { display: 'flex', flexDirection: 'column', flexGrow: 1 }
            : { minHeight: '100%' }
        }
      >
        {tab.body}
      </Typography>
    </Box>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

export default TabPanel;

export { a11yProps };
