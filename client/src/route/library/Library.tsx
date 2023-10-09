
import * as React from 'react';
import Layout from 'page/Layout';
import Iframe from 'components/Iframe';
import { Tabs, TabList, Tab, TabPanel } from 'react-tabs';
import { useURLforLIB } from 'util/envUtil';
import { Typography } from '@mui/material';
import { useAuth } from 'react-oidc-context';
import { getAndSetUsername } from '../../util/auth/Authentication';
import 'react-tabs/style/react-tabs.css';
import { tabs1, tabs2 } from './LibraryTabData'; // Imports both types of Tabs


function constructURL(tab: string, subTab: string, LIBURL: any) {
  // tab and subtab to lowercase
  const formattedTab = tab.toLowerCase();
  const formattedSubTab = subTab.toLowerCase();

  let url = `${LIBURL}tree/`;

  if (formattedSubTab === "common") {
    url = `${url}${formattedSubTab}/`;
  } 
  
  if (formattedTab === "digital twins") {
    return `${url}digital_twins`;
  } 
  
  return `${url}${formattedTab}`;

}

/*
 *  2 lines Tabs using React Tabs
 *
 *  tabs1 -> Type 1 of tabs from LibraryTabData
 *  tabs2 -> Type 2 of tabs from LibraryTabData
 *  tab1  -> Type 1 tabs used for first map of tabList
 *  tab2  -> Type 2 tabs used for first map of tabList
 *  tab11  -> Type 1 tabs used for map of tabPanels
 *  tab22  -> Type 2 tabs used for map of tabPanels
 * 
 */

function LibraryContent() {
  const LIBurl = useURLforLIB();
  const auth = useAuth();
  getAndSetUsername(auth);

  return (

    <Layout>
      <Tabs forceRenderTabPanel defaultIndex={1}>
        <TabList>
          {tabs1.map((tab1, index1) => (
            <Tab key={index1}>{tab1.label}</Tab>
          ))}
        </TabList>

        {tabs1.map((tab11, index11) => (
          <TabPanel key={index11}>
            
            <Tabs forceRenderTabPanel>
              <TabList>
                {tabs2.map((tab2, index2) => (
                  <Tab key={index2}>{tab2.label}</Tab>
                ))}
              </TabList>

              {tabs2.map((tab22, index22) => (
                <TabPanel key={index22}>
                  <br />
                  <Typography variant="body1">{tab11.body}</Typography>
                  <br />
                  <Typography variant="body1">{tab22.body}</Typography>
                  <br />
                  <Iframe title={`Digital Twin as a Service`} url={constructURL(tab11.label, tab22.label, LIBurl)} />
                </TabPanel>
              ))}
            </Tabs>

          </TabPanel>
        ))}
      </Tabs>
    
    </Layout>
  );
}

export default function Library() {
  return <LibraryContent />;
}
