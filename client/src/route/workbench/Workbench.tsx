import { Paper } from '@mui/material';
import Iframe from 'components/Iframe';
import Layout from 'page/Layout';
import * as React from 'react';

const UrlWorkbench = window.env.REACT_APP_URL_WORKBENCH;

function WorkBenchContent() {
  /*
  Will become configurable in the next iteration
  const UrlWorkbench = new URL('user/2/tree?', window.location.href);
  */

  return (
    <Layout>
      <Paper
        sx={{
          p: 2,
          height: '100%',
        }}
      >
        <Iframe title="workbench-sandbox" url={UrlWorkbench} />
      </Paper>
    </Layout>
  );
}

export default function WorkBench() {
  return <WorkBenchContent />;
}
