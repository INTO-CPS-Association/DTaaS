import * as React from 'react';
import Layout from 'page/Layout';
import TabComponent from 'components/tab/TabComponent';
import Iframe from 'components/Iframe';
import { TabData } from 'components/tab/subcomponents/TabRender';
import tabs from './LibraryTabData';

const jupyterURL = window.env.REACT_APP_URL_LIB;

const tabsData: TabData[] = tabs.map((tab) => ({
  label: tab.label,
  body: (
    <>
      {tab.body}
      <Iframe
        title={`JupyterLight-Demo-${tab.label}`}
        url={`${jupyterURL}`}
        fullsize
      />
    </>
  ),
}));

function LibraryContent() {
  return (
    <Layout>
      <TabComponent tabs={tabsData} />
    </Layout>
  );
}

export default function Library() {
  return <LibraryContent />;
}
