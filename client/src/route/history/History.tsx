import * as React from 'react';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import RecentRuns from './RecentRuns';
import Logs from './Logs';

function HistoryContent() {
  return (
    <Grid container spacing={3}>
      {/* Past Runs */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
          <RecentRuns />
        </Paper>
      </Grid>
      {/* Logs */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
          <Logs />
        </Paper>
      </Grid>
    </Grid>
  );
}

export default function DTHistory() {
  return <HistoryContent />;
}
