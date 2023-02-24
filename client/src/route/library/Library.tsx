import * as React from 'react';
import Layout from 'page/Layout';

import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import LibComponents from './Components';

function LibraryContent() {
  return (
    <Layout>
      <Grid container spacing={3}>
        {/* Components */}
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
      </Grid>
    </Layout>
  );
}

export default function Library() {
  return <LibraryContent />;
}
