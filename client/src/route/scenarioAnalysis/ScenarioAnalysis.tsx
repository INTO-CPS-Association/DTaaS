import * as React from 'react';
import Layout from 'page/Layout';
import TabComponent from 'components/tab/TabComponent';
import { TabData } from 'components/tab/subcomponents/TabRender';
import { Typography } from '@mui/material';
import tabs from './ScenarioAnalysisTabData';

const tabData: TabData[] = tabs.map((tab) => ({
  label: tab.label,
  body: <Typography variant="body1">{tab.body}</Typography>,
}));

function SAnalysisContent() {
  return (
    <Layout>
      <TabComponent tabs={tabData} />
    </Layout>
  );
}

export default function ScenarioAnalysis() {
  return <SAnalysisContent />;
}
