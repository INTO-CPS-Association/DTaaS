import * as React from 'react';
import Layout from 'page/Layout';
import TabComponent from 'components/tab/TabComponent';
import Iframe from 'components/Iframe';
import { TabData } from 'components/tab/subcomponents/TabRender';
import { getURLforLIB } from 'util/envUtil';
import { Typography } from '@mui/material';
import tabs from './LibraryTabData';

function LibraryContent() {
  const jupyterURL = getURLforLIB();

  const tabsData: TabData[] = tabs.map((tab) => ({
    label: tab.label,
    body: (
      <>
        <Typography variant="body1">{tab.body}</Typography>
        <Iframe title={`JupyterLight-Demo-${tab.label}`} url={jupyterURL} />
      </>
    ),
  }));
  return (
    <Layout>
      <TabComponent tabs={tabsData} />
    </Layout>
  );
}

export default function Library() {
  return <LibraryContent />;
}
