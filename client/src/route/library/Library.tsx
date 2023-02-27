import * as React from 'react';

import Grid from '@mui/material/Grid';
import LibComponents from './Components';

function LibraryContent() {
  return (
    <Grid item xs={12} md={8} lg={9}>
        <LibComponents />
    </Grid>
  );
}

export default function Library() {
  return <LibraryContent />;
}
