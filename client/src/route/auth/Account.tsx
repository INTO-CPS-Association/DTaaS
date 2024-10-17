import * as React from 'react';
import Layout from 'page/Layout';
import TabComponent from 'components/tab/TabComponent';
import { TabData } from 'components/tab/subcomponents/TabRender';
import tabs from './AccountTabData';

function AccountContent() {
  const AccountTab: TabData[] = tabs.map((tab) => ({
    label: tab.label,
    body: tab.body,
  }));

  return (
    <Layout sx={{ display: 'flex' }}>
      <TabComponent assetType={AccountTab} scope={[]} />
    </Layout>
  );
}

export default function Account() {
  return <AccountContent />;
}
