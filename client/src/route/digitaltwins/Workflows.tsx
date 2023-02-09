import * as React from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

interface TabPanelProps{
  children: React.ReactNode,
  index: number,
  value: number,
}

function TabPanel(props: TabPanelProps) {
  const {
    children, value, index, ...other
  } = props;

  return (
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
  );
}

function a11yProps(index:number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

export default function Workflows() {
  const [value, setValue] = React.useState<number>(0);

  const handleChange = (event:React.SyntheticEvent<Element, Event>, newValue:number) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="basic tabs example">
          <Tab label="Create" {...a11yProps(0)} />
          <Tab label="Execute" {...a11yProps(1)} />
          <Tab label="Analyze" {...a11yProps(2)} />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        Create digital twins from available library components.
        The text and graphical configuration of digital twins happen here.
      </TabPanel>
      <TabPanel value={value} index={1}>
          Execute the digital twins with the DTaaS performing the
          automated deployment and execution.
          Potential realtime interactions must be possible.
          There should be an accordion of DT summary, Visualization, Output, Logs.
      </TabPanel>
      <TabPanel value={value} index={2}>
          Execution summary, output data in text and graphical formats
      </TabPanel>
    </Box>
  );
}
