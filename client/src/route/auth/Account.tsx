import * as React from 'react';
import Grid from '@mui/material/Grid';
import AccountTabs from './AccountTabs';

const DTContent: React.FC = () => (
  <Grid item xs={12} md={8} lg={9}>
    <AccountTabs />
  </Grid>
);

const DigitalTwins: React.FC = () => <DTContent />; /* jshint ignore:line */
export default DigitalTwins;
