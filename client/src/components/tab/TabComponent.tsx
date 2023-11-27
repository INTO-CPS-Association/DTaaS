import * as React from 'react';
import TabRender, { TabData } from './subcomponents/TabRender';
import { Tab, TabList, TabPanel, Tabs } from './subcomponents/TabStyles';

export function constructURL(assetType: string, scope: string, libURL: string) {
  let assetTab = assetType.toLowerCase();
  let scopeTab = scope.toLowerCase();

  assetTab = assetTab === 'digital twins' ? 'digital_twins' : assetTab;
  scopeTab = scopeTab === 'private' ? '' : `${scopeTab}/`;

  return `${libURL}tree/${scopeTab}${assetTab}`;
}

function renderScopeTabList(scope: TabData[][], subIndex: number): JSX.Element {
  return (
    <TabList>
      {scope &&
        scope[subIndex] &&
        scope[subIndex].map((tab, index) => <Tab key={index}>{tab.label}</Tab>)}
    </TabList>
  );
}

function renderScopeTabPanels(
  scope: TabData[][],
  subIndex: number,
): JSX.Element {
  return (
    <>
      {scope &&
        scope[subIndex] &&
        scope[subIndex].map((tab, index) => (
          <TabPanel key={index}>
            <TabRender index={index}>{tab}</TabRender>
          </TabPanel>
        ))}
    </>
  );
}

export function TabComponent(props: {
  assetType: TabData[];
  scope: TabData[][];
}): JSX.Element {
  return (
    <Tabs>
      <TabList>
        {props.assetType.map((tab, index) => (
          <Tab key={index}>{tab.label}</Tab>
        ))}
      </TabList>{' '}
      {props.assetType.map((subtab, subIndex) => (
        <TabPanel key={subIndex}>
          <TabRender index={subIndex}>{subtab}</TabRender>
          <Tabs>
            {renderScopeTabList(props.scope, subIndex)}
            {renderScopeTabPanels(props.scope, subIndex)}
          </Tabs>
        </TabPanel>
      ))}
    </Tabs>
  );
}

export default TabComponent;
