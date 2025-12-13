import Layout from 'page/Layout';
import TabComponent, { constructURL } from 'components/tab/TabComponent';
import Iframe from 'components/Iframe';
import { useURLforLIB } from 'util/envUtil';
import { Typography } from '@mui/material';
import { useAuth } from 'react-oidc-context';
import { useGetAndSetUsername } from 'util/auth/Authentication';
import { assetType, scope } from 'route/library/LibraryTabData';

export function createTabs() {
  return assetType.map((tab) => ({
    label: tab.label,
    body: (
      <>
        <Typography variant="body1">{tab.body}</Typography>
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
          <Typography variant="body1">{subtab.body}</Typography>
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
  getAndSetUsername(auth);

  const tabsData = createTabs();

  const combinedData = createCombinedTabs();

  return (
    <Layout sx={{ display: 'flex' }}>
      <TabComponent assetType={tabsData} scope={combinedData} />
    </Layout>
  );
}
export default function Library() {
  return <LibraryContent />;
}
