import { Paper } from '@mui/material';
import Iframe from 'components/Iframe';
import Layout from 'page/Layout';
import * as React from 'react';
import { getURLforWorkbench } from 'util/envUtil';

const UrlWorkbench = getURLforWorkbench();

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
          display: 'flex',
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
