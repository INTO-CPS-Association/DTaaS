import * as React from 'react';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Workflows from './Workflows';

function DTContent() {
  return (
        <Grid item xs={12} md={8} lg={9}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              minHeight: '100%',
            }}
          >
            <Workflows />
          </Paper>
      </Grid>
  );
}

export default function DigitalTwins() {
  return <DTContent />;
}
