import * as React from 'react';
import Layout from 'page/Layout';
import TabComponent, { constructURL } from 'components/tab/TabComponent';
import Iframe from 'components/Iframe';
import { TabData } from 'components/tab/subcomponents/TabRender';
 import { useURLforLIB } from 'util/envUtil';
import { Typography } from '@mui/material';
import { useAuth } from 'react-oidc-context';
import { getAndSetUsername } from '../../util/auth/Authentication';
import { assetType, scope } from './LibraryTabData';



/*
 * I've only changed the use of the Iframe because Iframe is added in the Tab component -->
 * --> not in this step
 *
 * Also I've changed the import of LibraryTabData to match the data tipes names
 */

function LibraryContent() {
  const LIBurl = useURLforLIB();
  const auth = useAuth();
  getAndSetUsername(auth);

  const tabsData: TabData[] = assetType.map((tab) => ({
    label: tab.label,
    body: (
      <>
        <Typography variant="body1">{tab.body}</Typography>
      </>
    ),
  }));


  const combinedData: TabData[][] = assetType.map((tab) =>
  scope.map((subtab) => ({
    label: `${subtab.label}`,
    body: (
      <>
        <Typography variant="body1">{subtab.body}</Typography>
        <Iframe title={`${tab.label}`} url={constructURL(tab.label, subtab.label, LIBurl)} />
      </>
    ),
  }))
);

  return (
    <Layout>
      <TabComponent assetType={tabsData} scope={combinedData} />
    </Layout>
  );
}

export default function Library() {
  return <LibraryContent />;
}
