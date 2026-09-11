import Layout from 'page/Layout';
import { useEffect } from 'react';
import TabComponent, { constructURL } from 'components/tab/TabComponent';
import Iframe from 'components/Iframe';
import { useURLforLIB } from 'util/envUtil';
import { useAuth } from 'react-oidc-context';
import { useGetAndSetUsername } from 'util/auth/Authentication';
import { assetType, scope } from 'route/library/LibraryTabData';
import PageShell from 'components/PageShell';
import TabDescription from 'components/tab/TabDescription';

export function createTabs() {
  return assetType.map((tab) => ({
    label: tab.label,
    body: (
      <>
        <TabDescription>{tab.body}</TabDescription>
      </>
    ),
  }));
}

export function createCombinedTabs() {
  return assetType.map((tab) =>
    scope.map((subtab) => ({
      label: `${subtab.label}`,
      body: (
        <>
          <TabDescription>{subtab.body}</TabDescription>
          <Iframe
            title={`${tab.label}`}
            url={constructURL(tab.label, subtab.label, useURLforLIB())}
          />
        </>
      ),
    })),
  );
}

function LibraryContent() {
  const auth = useAuth();
  const getAndSetUsername = useGetAndSetUsername();

  useEffect(() => {
    getAndSetUsername(auth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user]);

  const tabsData = createTabs();

  const combinedData = createCombinedTabs();

  return (
    <Layout>
      <PageShell
        title="Library"
        description="Reusable assets in your workspace: functions, models, tools, data and digital twins."
      >
        <TabComponent assetType={tabsData} scope={combinedData} />
      </PageShell>
    </Layout>
  );
}
export default function Library() {
  return <LibraryContent />;
}
