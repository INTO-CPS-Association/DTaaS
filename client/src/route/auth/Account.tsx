import * as React from 'react';
import Layout from 'page/Layout';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import AccountTabs from './AccountTabs';

const DTContent: React.FC = () => (
  <Layout>
    <Grid item xs={12} md={8} lg={9}>
      <Paper
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          height: 240,
        }}
      >
        <AccountTabs />
      </Paper>
    </Grid>
  </Layout>
);

const DigitalTwins: React.FC = () => <DTContent />; /* jshint ignore:line */
export default DigitalTwins;
