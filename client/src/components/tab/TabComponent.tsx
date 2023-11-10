import * as React from 'react';

import { Paper } from '@mui/material';
// import { scope } from 'route/library/LibraryTabData';
import TabRender, { TabData } from './subcomponents/TabRender';
import { Tab, TabList, TabPanel, Tabs } from './subcomponents/TabStyles';
// import { scope } from 'route/library/LibraryTabData';
// import { scope} from '../../route/library/LibraryTabData';


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

export function TabComponent(props: { tabs: TabData[]}) {
  return (
    <Paper
      sx={{ p: 2, display: 'flex', flexDirection: 'column', minHeight: '100%' }}
    >
      <Tabs>
        <TabList>
          {props.tabs.map((tab, index) => (
            <Tab key={index}>{tab.label}</Tab>
          ))}
        </TabList>
        {props.tabs.map((tab, index) => (
          <TabPanel key={index}>
            <TabRender index={index}>{tab}</TabRender>

            
          </TabPanel>
        ))}
      </Tabs>
    </Paper>
  );
}

export default TabComponent;