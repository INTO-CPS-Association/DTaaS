import * as React from 'react';

import Iframe from 'react-iframe';
import { cleanURL, useURLforLIB } from 'util/envUtil';

import { Paper, Typography } from '@mui/material';
import TabRender, { TabData } from './subcomponents/TabRender';
import { Tab, TabList, TabPanel, Tabs } from './subcomponents/TabStyles';

export function constructURL(assetType: string, scope: string, libURL: string) {
  const formattedTab = assetType.toLowerCase();
  const formattedSubTab = scope.toLowerCase();

  let url = cleanURL(libURL);
  url += "/tree/";

  if (formattedTab === 'digital twins') {
    url += 'digital_twins';
    if (formattedSubTab === 'private') {
      url += '/private';
    }
  } else if (formattedSubTab === 'private') {
    url += `${formattedTab}/${formattedSubTab}`;
  } else {
    url += formattedTab;
  }

  return url;
}

/*
 * Ive only added the subtabs for the private and common and the Iframe with the correct url
 * TabRender component will show the text information from the main tab and Iframe will make sure the url is the correct
 */


// removed import from LibraryTabData, added scope as a prop to TabComponent. changed two lvl tabs to Tab -> Text -> Tab -> Text


export function TabComponent(props: { assetType: TabData[], scope: TabData[] }) {
  const LIBurl = useURLforLIB();

  return (
    <Paper
      sx={{ p: 2, display: 'flex', flexDirection: 'column', minHeight: '100%' }}
    >
      <Tabs>
        <TabList>
          {props.assetType.map((tab, index) => (
            <Tab key={index}>{tab.label}</Tab>
          ))}
        </TabList>
        {props.assetType.map((tab, index) => (
          <TabPanel key={index}>
            <Typography>{tab.body}</Typography>
            <Tabs forceRenderTabPanel>
              <TabList>
                {props.scope.map((subTab, subIndex) => (
                  <Tab key={subIndex}>{subTab.label}</Tab>
                ))}
              </TabList>
              {props.scope.map((subTab, subIndex) => (
                <TabPanel key={subIndex}>
                  <TabRender index={subIndex}>{subTab}</TabRender>
                  <Iframe
                    title={`${tab.label}`}
                    url={constructURL(tab.label, subTab.label, LIBurl)}
                  />
                </TabPanel>
              ))}
            </Tabs>
          </TabPanel>
        ))}
      </Tabs>
    </Paper>
  );
}



export default TabComponent;
