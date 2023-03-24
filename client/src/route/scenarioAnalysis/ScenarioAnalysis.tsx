import * as React from 'react';
import Layout from 'page/Layout';
import Workflows from './Workflows';

function SAnalysisContent() {
  return (
    <Layout>
      <Workflows />
    </Layout>
  );
}

export default function ScenarioAnalysis() {
  return <SAnalysisContent />;
}
