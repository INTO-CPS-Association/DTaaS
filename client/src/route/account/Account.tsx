import Layout from 'page/Layout';
import TabComponent from 'components/tab/TabComponent';
import { TabData } from 'components/tab/subcomponents/TabRender';
import tabs from 'route/account/AccountTabData';
import PageShell from 'components/PageShell';

function AccountContent() {
  const AccountTab: TabData[] = tabs.map((tab) => ({
    label: tab.label,
    body: tab.body,
    loggerContext: { account: { tab: tab.label.toLowerCase() } },
  }));

  return (
    <Layout>
      <PageShell
        title="Account"
        description="Your profile as GitLab knows it, and the settings this application keeps."
      >
        <TabComponent assetType={AccountTab} scope={[]} />
      </PageShell>
    </Layout>
  );
}

export default function Account() {
  return <AccountContent />;
}
