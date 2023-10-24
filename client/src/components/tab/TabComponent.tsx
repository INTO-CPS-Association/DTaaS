import * as React from 'react';

import Iframe from 'react-iframe';
import { useURLforLIB } from 'util/envUtil';

import { Paper } from '@mui/material';
import TabRender, { TabData } from './subcomponents/TabRender';
import { Tab, TabList, TabPanel, Tabs } from './subcomponents/TabStyles';
import {tabs2 as scope} from '../../route/library/LibraryTabData';




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
  * Ive only added the subtabs for the private and common and the Iframe with the correct url
  * TabRender component will show the text information from the main tab and Iframe will make sure the url is the correct
  */

function TabComponent(props: { tabs: TabData[] }) {

  const LIBurl = useURLforLIB();
  
  return (
    <Paper
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
      }}
    >
      <Tabs>
        <TabList>
          {props.tabs.map((tab, index) => (
            <Tab key={index}>{tab.label}</Tab>
          ))}
        </TabList>
        {props.tabs.map((tab, index) => (
          <TabPanel key={index}>

            {/* New from here */}

            <Tabs forceRenderTabPanel>
              <TabList>
                {scope.map((subTab, subIndex) => (
                  <Tab key={subIndex}>{subTab.label}</Tab>      
                ))}
              </TabList>

              {scope.map((subTab, subIndex) => (
              <TabPanel key={subIndex}>

                <TabRender index={index}>{tab}</TabRender>

                <Iframe title={`Digital Twin as a Service`} url={constructURL(tab.label, subTab.label, LIBurl)} />

              </TabPanel>
              ))}
            </Tabs>

            {/* Ends New */}

          </TabPanel>
        ))}
      </Tabs>
    </Paper>
  );
}

export default TabComponent;