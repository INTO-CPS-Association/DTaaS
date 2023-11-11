import * as React from 'react';

// import Iframe from 'react-iframe';
// import { useURLforLIB } from 'util/envUtil';

import { Paper } from '@mui/material';
import TabRender, { TabData } from './subcomponents/TabRender';
import { Tab, TabList, TabPanel, Tabs } from './subcomponents/TabStyles';
// import { assetType } from '../../route/library/LibraryTabData';

export function constructURL(tab: string, subTab: string, LIBURL: string) {
  // tab and subtab to lowercase
  const formattedTab = tab.toLowerCase();
  const formattedSubTab = subTab.toLowerCase();

  let url = `${LIBURL}tree/`;

  if (formattedSubTab === 'common') {
    url = `${url}${formattedSubTab}/`;
  }

  if (formattedTab === 'digital twins') {
    return `${url}digital_twins`;
  }

  return `${url}${formattedTab}`;
}

/*
 * Ive only added the subtabs for the private and common and the Iframe with the correct url
 * TabRender component will show the text information from the main tab and Iframe will make sure the url is the correct
 */

export function TabComponent(props: { tabs1: TabData[], tabs: TabData[][] }) {
  // const LIBurl = useURLforLIB();
  return (
    <Paper
      sx={{ p: 2, display: 'flex', flexDirection: 'column', minHeight: '100%' }}
    >
      <Tabs>
        <TabList>
          {props.tabs1.map((tab, index) => (
            <Tab key={index}>{tab.label}</Tab>
          ))}
        </TabList>
        {props.tabs1.map((tab1, index1) => (
          <TabPanel key={index1}>
            <TabRender index={index1}>{tab1}</TabRender>

            <Tabs forceRenderTabPanel>
              <TabList>
                {props.tabs[index1].map((tab, index) => (
                  <Tab key={index}>{tab.label}</Tab>
                ))}
              </TabList>
              {props.tabs[index1].map((tab, index) => (
                <TabPanel key={index}>
                  <TabRender index={index}>{tab}</TabRender>
                </TabPanel>
              ))}
            </Tabs>

            {/* <Tabs forceRenderTabPanel>
              <TabList>
                {scope.map((subTab, subIndex) => (
                  <Tab 
                    key={subIndex}>{subTab.label}
                  </Tab>
                ))}{' '}
              </TabList>
              {scope.map((subTab, subIndex) => (
                <TabPanel key={subIndex}>
                  <TabRender index={index}>{tab} </TabRender>
                  <Iframe
                    title={`${tab.label}`}
                    url={constructURL(tab.label, subTab.label, LIBurl)}
                  />
                </TabPanel>
              ))}
            </Tabs> */}
          </TabPanel>
        ))}
      </Tabs>
    </Paper>
  );
}

export default TabComponent;
