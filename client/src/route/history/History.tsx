import * as React from 'react';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Layout from 'page/Layout';
import RecentRuns from 'components/RecentRuns';
import Logs from './Logs';

function DTHistory() {
  const sections = [
    { component: <RecentRuns />, xs: 12 },
    { component: <Logs />, xs: 12 },
  ];

  return (
    <Layout>
      {sections.map((section, index) => (
        <Grid key={index} item xs={section.xs}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            {section.component}
          </Paper>
        </Grid>
      ))}
    </Layout>
  );
}

export default DTHistory;
