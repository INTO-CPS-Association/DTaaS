import * as React from 'react';
import Grid from '@mui/material/Grid';
import Workflows from './Workflows';

function DTContent() {
  return (
    <Grid item xs={12} md={12} lg={12}>
        <Workflows />
    </Grid>
  );
}

export default function DigitalTwins() {
  return <DTContent />;
}
