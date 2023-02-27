/*
source: https://github.com/mui/material-ui/tree/v5.10.0/docs/data/material/getting-started/templates/dashboard
*/
import * as React from 'react';
import Layout from 'page/Layout';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Chart from '../history/Chart';
import RecentRuns from '../history/RecentRuns';

function DashboardContent() {
  return (
    <Layout>
      {/* Chart */}
      <Grid item xs={12} md={8} lg={9}>
        <Paper
          sx={{
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            height: 240,
          }}
        >
          <Chart />
        </Paper>
      </Grid>
      {/* Past Runs */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
          <RecentRuns />
        </Paper>
      </Grid>
    </Layout>
  );
}

export default function Dashboard() {
  return <DashboardContent />;
}
