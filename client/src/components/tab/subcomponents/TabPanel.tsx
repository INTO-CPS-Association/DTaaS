import { Box, Typography } from '@mui/material';
import React from 'react';

interface OwnProps {
  children: React.ReactNode;
  index: number;
  value: number;
  fullsize?: boolean;
}

function TabPanel(props: OwnProps) {
  const { children, value, index, ...other } = props;

  return (
    <Box
      role="tabpanel"
      display={value === index ? 'block' : 'none'}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      sx={{
        p: 2,
        ...(props.fullsize
          ? { display: 'flex', flexDirection: 'column', flexGrow: 1 }
          : { minHeight: '100%' }),
      }}
      {...other}
    >
      {value === index && (
        <Typography
          {...props}
          sx={
            props.fullsize
              ? { display: 'flex', flexDirection: 'column', flexGrow: 1 }
              : { minHeight: '100%' }
          }
        >
          {children}
        </Typography>
      )}
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
