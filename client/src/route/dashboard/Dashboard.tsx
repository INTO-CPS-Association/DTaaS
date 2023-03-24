/*
source: https://github.com/mui/material-ui/tree/v5.10.0/docs/data/material/getting-started/templates/dashboard
*/
import * as React from 'react';
import Paper from '@mui/material/Paper';
import Layout from 'page/Layout';
import Chart from '../history/Chart';
import RecentRuns from '../history/RecentRuns';

function DashboardContent() {
  return (
    <Layout>
      {/* Chart */}
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
      {/* Past Runs */}
      <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
        <RecentRuns />
      </Paper>
    </Layout>
  );
}

export default function Dashboard() {
  return <DashboardContent />;
}
