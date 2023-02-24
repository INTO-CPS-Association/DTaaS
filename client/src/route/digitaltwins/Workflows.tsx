import * as React from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import TabPanel, { a11yProps } from 'components/TabPanel';
import { useState, SyntheticEvent } from 'react';
import Iframe from 'components/Iframe';

function Workflows() {
  const [activeTab, setSelectedTabIndex] = useState<number>(0);

  // TODO: Make interface for this. Set index as key.
  const tabs = [
    {
      label: 'Create',
      index: 0,
      body: 'Create digital twins from available library components. The text and graphical configuration of digital twins happen here.',
    },
    {
      label: 'Execute',
      index: 1,
      body: 'Execute the digital twins with the DTaaS performing the automated deployment and execution. Potential realtime interactions must be possible. There should be an accordion of DT summary, Visualization, Output, Logs.',
    },
    {
      label: 'Analyze',
      index: 2,
      body: 'Execution summary, output data in text and graphical formats',
    },
  ];

  // TODO: URL should depend on the selected tab. Get from .env
  const jupyterURL =
    'https://jupyterlite.github.io/demo/repl/index.html?kernel=javascript&toolbar='.concat(
      activeTab.toString()
    );

  const handleTabChange = (
    _event: SyntheticEvent<Element, Event>,
    newValue: number
  ): void => {
    setSelectedTabIndex(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="basic tabs example"
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.index}
              label={tab.label}
              {...a11yProps(tab.index)}
            />
          ))}
        </Tabs>
      </Box>
      {tabs.map((tab) => (
        <TabPanel key={tab.index} value={activeTab} index={tab.index}>
          {tab.body}
          <Iframe data={tab} url={jupyterURL} />
        </TabPanel>
      ))}
    </Box>
  );
}

export default Workflows;
