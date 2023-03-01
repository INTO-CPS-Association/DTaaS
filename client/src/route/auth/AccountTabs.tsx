import * as React from 'react';
import TabComponent, { TabData } from 'components/tab/TabComponent';

const tabs: TabData[] = [
  {
    index: 0 as TabData['index'],
    label: 'Profile',
    body: <>Profile - potentially visible to other users.</>,
  },
  {
    index: 1 as TabData['index'],
    label: 'Settings',
    body: <>Account settings - private to a user.</>,
  },
];

function AccountTabs() {
  return <TabComponent tabs={tabs} />;
}

export default AccountTabs;
