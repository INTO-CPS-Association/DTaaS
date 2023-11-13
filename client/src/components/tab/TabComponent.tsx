import * as React from 'react';
import { cleanURL } from 'util/envUtil';
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

export function TabComponent(props: { assetType: TabData[], scope: TabData[][] }) {

  return (
    <Tabs>
      <TabList>
        {props.assetType.map((tab, index) => (
          <Tab key={index}>{tab.label}</Tab>
        ))}
      </TabList>
      {props.assetType.map((tab1, index1) => (
        <TabPanel key={index1}>
          <TabRender index={index1}>{tab1}</TabRender>

          <Tabs forceRenderTabPanel>
            <TabList>
              {props.scope[index1].map((tab, index) => (
                <Tab key={index}>{tab.label}</Tab>
              ))}
            </TabList>
            {props.scope[index1].map((tab, index) => (
              <TabPanel key={index}>
                <TabRender index={index}>{tab}</TabRender>
              </TabPanel>
            ))}
          </Tabs>
        </TabPanel>
      ))}
    </Tabs>
  );
}

export default TabComponent;
