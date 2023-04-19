import * as React from 'react';
import Layout from 'page/Layout';
import TabComponent from 'components/tab/TabComponent';
import Iframe from 'components/Iframe';
import { TabData } from 'components/tab/subcomponents/TabRender';
import { getURLforDT } from 'util/envUtil';
import { Typography } from '@mui/material';
import tabs from './DigitalTwinTabData';

const jupyterURL = getURLforDT();

const tabData: TabData[] = tabs.map((tab, i) => ({
  label: tab.label,
  body: (
    <>
      <Typography variant="body1">{tab.body}</Typography>
      {i === 0 && (
        <>
          <Iframe title={`JupyterLight-Demo-${tab.label}`} url={jupyterURL} />
        </>
      )}
    </>
  ),
}));

function DTContent() {
  return (
    <Layout>
      <TabComponent tabs={tabData} />
    </Layout>
  );
}

export default function DigitalTwins() {
  return <DTContent />;
}
