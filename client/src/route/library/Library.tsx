import * as React from 'react';

import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import LibComponents from './Components';

function LibraryContent() {
  return (
    <Grid item xs={12} md={8} lg={9}>
      <Paper
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          height: 240,
        }}
      >
        <LibComponents />
      </Paper>
    </Grid>
  );
}

export default function Library() {
  return <LibraryContent />;
}
