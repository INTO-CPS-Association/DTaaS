import * as React from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import TabPanel, { a11yProps } from 'components/TabPanel';
import { useState, SyntheticEvent } from 'react';
import Iframe from 'components/Iframe';

function Workflows() {
  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(0);

  const tabs = [
    { label: 'Create', index: 0 },
    { label: 'Execute', index: 1 },
    { label: 'Analyze', index: 2 },
  ];

  // TODO: URL should depend on the selected tab
  const jupyterURL = 'https://jupyterlite.github.io/demo/repl/index.html?kernel=javascript&toolbar=0'
    .concat(
      selectedTabIndex.toString(),
    );

  const handleChange = (
    event: SyntheticEvent<Element, Event>,
    newValue: number,
  ) => {
    setSelectedTabIndex(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={selectedTabIndex}
          onChange={handleChange}
          aria-label="basic tabs example"
        >
          <Tab label={tabs[0].label} {...a11yProps(0)} />
          <Tab label={tabs[1].label} {...a11yProps(1)} />
          <Tab label={tabs[2].label} {...a11yProps(2)} />
        </Tabs>
      </Box>
      <TabPanel value={selectedTabIndex} index={0}>
        Create digital twins from available library components. The text and
        graphical configuration of digital twins happen here.
        <Iframe data={tabs[0]} url={jupyterURL} />
      </TabPanel>
      <TabPanel value={selectedTabIndex} index={1}>
        Execute the digital twins with the DTaaS performing the automated
        deployment and execution. Potential realtime interactions must be
        possible. There should be an accordion of DT summary, Visualization,
        Output, Logs.
        <Iframe data={tabs[1]} url={jupyterURL} />
      </TabPanel>
      <TabPanel value={selectedTabIndex} index={2}>
        Execution summary, output data in text and graphical formats
        <Iframe data={tabs[2]} url={jupyterURL} />
      </TabPanel>
    </Box>
  );
}

export default Workflows;
