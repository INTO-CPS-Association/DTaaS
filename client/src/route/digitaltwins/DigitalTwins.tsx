import * as React from 'react';
import Layout from 'page/Layout';
import TabComponent from 'components/tab/TabComponent';
import Iframe from 'components/Iframe';
import { TabData } from 'components/tab/subcomponents/TabRender';
import { useURLforDT } from 'util/envUtil';
import { Typography } from '@mui/material';
import tabs from './DigitalTwinTabData';

function DTContent() {
  const DTurl = useURLforDT();

  const tabData1: TabData[] = tabs.map((tab) => ({
    label: tab.label,
    body: (
      <>
        <Typography variant="body1">{tab.body}</Typography>
        <>
          {' '}
          <Iframe title={`JupyterLight-Demo-${tab.label}`} url={DTurl} />{' '}
        </>
      </>
    ),
  }));

  const tabData: TabData[][] = Array(2).fill(
    tabs.map((tab, i) => ({
      label: tab.label,
      body: i,
    }))
  );

  return (
    <Layout>
      <TabComponent assetType={tabData1} scope={tabData} />
    </Layout>
  );
}

export default function DigitalTwins() {
  return <DTContent />;
}
