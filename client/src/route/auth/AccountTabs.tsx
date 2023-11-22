import * as React from 'react';
import TabComponent from 'components/tab/TabComponent';
import { TabData } from 'components/tab/subcomponents/TabRender';

const accountTab: TabData[] = [
  {
    label: 'Profile',
    body: <>Profile - potentially visible to other users.</>,
  },
  {
    label: 'Settings',
    body: <>Account settings - private to a user.</>,
  },
];

const scope: TabData[][] = [];

function AccountTabs() {
  return <TabComponent assetType={accountTab} scope={scope} />;
}

export default AccountTabs;
