import * as React from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TabPanel, { a11yProps } from 'components/tab/subcomponents/TabPanel';
import { useState, SyntheticEvent } from 'react';

type TabDataIndex = number & { readonly __tabDataIndex: unique symbol };

export interface TabData {
  index: TabDataIndex;
  label: string;
  body: JSX.Element;
  fullsize?: boolean;
}

export function createTabData(
  tabs: { label: string; body: JSX.Element }[],
  fullsize?: boolean
): TabData[] {
  return tabs.map(({ label, body }, index) => ({
    index: index as TabDataIndex,
    label,
    body,
    fullsize,
  }));
}

function TabComponent(props: { tabs: TabData[] }) {
  const [activeTab, setSelectedTabIndex] = useState<number>(0);

  const handleTabChange = (
    _event: SyntheticEvent<Element, Event>,
    newValue: number
  ): void => {
    setSelectedTabIndex(newValue);
  };

  return (
    <Paper
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        ...(props.tabs[activeTab].fullsize === true && { minHeight: '100%' }),
      }}
    >
      <Box
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="basic tabs example"
          sx={{
            display: 'flex',
            flexDirection: 'colum',
            flexGrow: 1,
          }}
        >
          {props.tabs.map((tab) => (
            <Tab
              key={tab.index}
              label={tab.label}
              {...a11yProps(tab.index)}
              sx={{ flexGrow: 1 }}
            />
          ))}
        </Tabs>
      </Box>
      {props.tabs.map((tab) => (
        <TabPanel key={tab.index} active={activeTab === tab.index}>
          {tab}
        </TabPanel>
      ))}
    </Paper>
  );
}

export default TabComponent;
