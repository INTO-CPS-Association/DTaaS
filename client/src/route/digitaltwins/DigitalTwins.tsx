import * as React from 'react';
import Layout from 'page/Layout';
import Workflows from './Workflows';

function DTContent() {
  return (
    <Layout>
      <Workflows />
    </Layout>
  );
}

export default function DigitalTwins() {
  return <DTContent />;
}
