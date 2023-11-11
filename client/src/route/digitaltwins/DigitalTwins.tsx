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

  const tabData1: TabData[] = tabs.map((tab, i) => ({
    label: tab.label,
    body: (
      <>
        <Typography variant="body1">{tab.body}</Typography>
        {i === 0 && (
          <>
            <Iframe title={`JupyterLight-Demo-${tab.label}`} url={DTurl} />
          </>
        )}
      </>
    ),
  }));

  const tabData: TabData[][] = Array(2).fill(
    tabs.map((tab, i) => ({
      label: tab.label,
      body: (
        <>
          <Typography variant="body1">{tab.body}</Typography>
          {i === 0 && (
            <>
              <Iframe title={`JupyterLight-Demo-${tab.label}`} url={DTurl} />
            </>
          )}
        </>
      ),
    }))
  );  

  return (
    <Layout>
      <TabComponent tabs1={tabData1} tabs={tabData} />
    </Layout>
  );
}

export default function DigitalTwins() {
  return <DTContent />;
}
