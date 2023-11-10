import * as React from 'react';
import Layout from 'page/Layout';
import { TabComponent } from 'components/tab/TabComponent';
import Iframe from 'components/Iframe';
import { TabData } from 'components/tab/subcomponents/TabRender';
import { useURLforLIB } from 'util/envUtil';
import { Typography } from '@mui/material';
import { useAuth } from 'react-oidc-context';
import { getAndSetUsername } from '../../util/auth/Authentication';
import { assetType, scope } from './LibraryTabData';

/*
 *  Iframe cannot be exposed here because the subtab or Scope is still
 *  unknown at this point
 */

function LibraryContent() {
  const LIBurl = useURLforLIB();
  const auth = useAuth();
  getAndSetUsername(auth);

   // Data information for 2nd layer Tabs
   const tabsScopeData: TabData[] = scope.map((tab) => ({
    label: tab.label,
    body: (
      <>
        <Typography variant="body1">{tab.body}</Typography>
        {/* { <Iframe title={`${tab.label}`} url={LIBurl} />} */}
      </>
    ),
  }));

  // Data information for 1st layer Tabs
  const tabsAssetTypeData: TabData[] = assetType.map((tab) => ({
    label: tab.label,
    body: (
      <>
        <Typography variant="body1">{tab.body}</Typography>
        <TabComponent tabs={tabsScopeData}/>
        { <Iframe title={`${tab.label}`} url={LIBurl} />}
      </>
    ),
  }));

  return (
    <Layout>
      <TabComponent tabs={tabsAssetTypeData}/>
    </Layout>
  );
}

export default function Library() {
  return <LibraryContent />;
}
