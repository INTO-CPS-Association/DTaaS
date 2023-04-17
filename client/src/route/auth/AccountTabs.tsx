import * as React from 'react';
import TabComponent from 'components/tab/TabComponent';
import { TabData } from 'components/tab/subcomponents/TabRender';

const tabs: TabData[] = [
  {
    label: 'Profile',
    body: <>Profile - potentially visible to other users.</>,
  },
  {
    label: 'Settings',
    body: <>Account settings - private to a user.</>,
  },
];

function AccountTabs() {
  return <TabComponent tabs={tabs} />;
}

export default AccountTabs;
