import * as React from 'react';
import { Paper, SxProps, Theme } from '@mui/material';
import TabRender, { TabData } from './subcomponents/TabRender';
import { Tab, TabList, TabPanel, Tabs } from './subcomponents/TabStyles';

function TabComponent(props: { tabs: TabData[]; sx?: SxProps<Theme> }) {
  return (
    <Paper
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        ...props.sx,
      }}
    >
      <Tabs>
        <TabList>
          {props.tabs.map((tab, index) => (
            <Tab key={index}>{tab.label}</Tab>
          ))}
        </TabList>
        {props.tabs.map((tab, index) => (
          <TabPanel key={index}>
            <TabRender index={index}>{tab}</TabRender>
          </TabPanel>
        ))}
      </Tabs>
    </Paper>
  );
}

export default TabComponent;
