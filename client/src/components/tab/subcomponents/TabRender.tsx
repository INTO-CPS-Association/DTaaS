import { Box } from '@mui/material';

interface TabRenderProps {
  index: number;
  children: TabData;
}

export interface TabData {
  label: string;
  body: React.ReactElement;
}

function TabRender(props: TabRenderProps) {
  const { children: tab, index } = props;

  return (
    <Box
      role="tabpanel"
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      sx={{
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
