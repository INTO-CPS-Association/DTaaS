import * as React from 'react';
import Layout from 'page/Layout';
import TabComponent from 'components/tab/TabComponent';
import Iframe from 'components/Iframe';
import { TabData } from 'components/tab/subcomponents/TabRender';
// import { useURLforLIB } from 'util/envUtil';
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
  // const LIBurl = useURLforLIB();
  const auth = useAuth();
  getAndSetUsername(auth);

  const tabsData: TabData[] = assetType.map((tab) => ({
    label: tab.label,
    body: (
      <>
        <Typography variant="body1">{tab.body}</Typography>
        {/* <Iframe title={`JupyterLight-Demo-${tab.label}`} url={LIBurl} /> */}
      </>
    ),
  }));







  const combinedData: TabData[][] = assetType.map((tab) =>
  scope.map((subtab) => ({
    label: `${tab.label} - ${subtab.label}`, // Combina las etiquetas de tab y subtab
    body: (
      <>
        {/* <Typography variant="body1">{tab.body}</Typography> */}
        <Typography variant="body1">{subtab.body}</Typography>
        <Iframe title={`${tab.label} - ${subtab.label}`} url={combineUrls(tab.label, subtab.label)} />
      </>
    ),
  }))
);

function combineUrls(tabLabel: string, subtabLabel: string) {
  // Lógica para combinar las URL según tus necesidades
  return `URL_COMBINADA/${tabLabel}/${subtabLabel}`;
}

// const flattenedCombinedData = combinedData.flat(); // Aplanar el arreglo









  return (
    <Layout>
      <TabComponent tabs1={tabsData} tabs={combinedData} />
    </Layout>
  );
}

export default function Library() {
  return <LibraryContent />;
}
