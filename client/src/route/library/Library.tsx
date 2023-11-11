import * as React from 'react';
import Layout from 'page/Layout';
import TabComponent from 'components/tab/TabComponent';
import { TabData } from 'components/tab/subcomponents/TabRender';
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

  const subtabsData: TabData[] = scope.map((tab) => ({
    label: tab.label,
    body: (
      <>
        <Typography variant="body1">{tab.body}</Typography>
      </>
    ),
  }));

  return (
    <Layout>
      <TabComponent assetType={tabsData} scope={subtabsData} />
    </Layout>
  );
}


export default function Library() {
  return <LibraryContent />;
}
