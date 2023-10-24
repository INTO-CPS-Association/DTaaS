import * as React from 'react';
import Layout from 'page/Layout';
import TabComponent from 'components/tab/TabComponent';
// import Iframe from 'components/Iframe';
import { TabData } from 'components/tab/subcomponents/TabRender';
// import { useURLforLIB } from 'util/envUtil';
import { Typography } from '@mui/material';
import { useAuth } from 'react-oidc-context';
import { getAndSetUsername } from '../../util/auth/Authentication';
import {tabs1 as tabs} from './LibraryTabData';


/*
 * I've only changed the use of the Iframe because Iframe is added in the Tab component -->
 * --> not in this step
 * 
 * Also I've changed the import of LibraryTabData to match the data tipes names
 */

function LibraryContent() {
  // const LIBurl = useURLforLIB();
  const auth = useAuth();
  getAndSetUsername(auth);

  const tabsData: TabData[] = tabs.map((tab) => ({
    label: tab.label,
    body: (
      <>
        <Typography variant="body1">{tab.body}</Typography>
        {/* <Iframe title={`JupyterLight-Demo-${tab.label}`} url={LIBurl} /> */}
      </>
    ),
  }));
  return (
    <Layout>
      <TabComponent tabs={tabsData} />
    </Layout>
  );
}

export default function Library() {
  return <LibraryContent />;
}