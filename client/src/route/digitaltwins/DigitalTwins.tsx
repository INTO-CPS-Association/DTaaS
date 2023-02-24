import * as React from 'react';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Workflows from './Workflows';

function DTContent() {
  return (
    <Grid container spacing={3}>
      {/* Components */}
      <Grid item xs={12} md={8} lg={9}>
        <Paper
          sx={{
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            height: 'fit-content',
          }}
        >
          <Workflows />
        </Paper>
      </Grid>
    </Grid>
  );
}

export default function DigitalTwins() {
  return <DTContent />;
}
