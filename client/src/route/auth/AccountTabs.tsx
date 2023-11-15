import * as React from 'react';
import TabComponent from 'components/tab/TabComponent';
import { TabData } from 'components/tab/subcomponents/TabRender';

const tabs1: TabData[] = [
  {
    label: 'Profile',
    body: <>Profile - potentially visible to other users.</>,
  },
  {
    label: 'Settings',
    body: <>Account settings - private to a user.</>,
  },
];

const tabs: TabData[][] = [];

function AccountTabs() {
  return <TabComponent assetType={tabs1} scope={tabs} />;
}

export default AccountTabs;
