import * as React from 'react';
import { Box } from '@mui/material';
import { TabData } from 'components/tab/TabComponent';

interface TabRenderProps {
  index: number;
  children: TabData;
}

function TabRender(props: TabRenderProps) {
  const { children: tab, index } = props;

  return (
    <Box
      role="tabpanel"
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      sx={{
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
      }}
    >
      {tab.body}
    </Box>
  );
}

export default TabRender;
