import * as React from 'react';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Workflows from './Workflows';

function SAnalysisContent() {
  return (
    <>
      <Grid item xs={12} md={8} lg={9}>
        <Paper
          sx={{
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            height: 240,
          }}
        >
          <Workflows />
        </Paper>
      </Grid>
    </>
  );
}

export default function ScenarioAnalysis() {
  return <SAnalysisContent />;
}
