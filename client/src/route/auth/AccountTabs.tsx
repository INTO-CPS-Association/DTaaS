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

// Convierte tabs en un array bidimensional
const tabs: TabData[][] = tabs1.map(tab => [tab]);

// Resultado: [[{ label: 'Profile', body: ... }], [{ label: 'Settings', body: ... }]]


function AccountTabs() {
  return <TabComponent tabs1={tabs1} tabs={tabs}/>;
}

export default AccountTabs;
