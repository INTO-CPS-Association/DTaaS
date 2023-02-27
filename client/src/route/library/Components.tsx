/*
src: https://mui.com/material-ui/react-tabs/
*/
import * as React from 'react';
import TabComponent, { TabData } from 'components/tab/TabComponent';

const tabs: TabData[] = [
  {
    index: 0 as TabData['index'],
    label: 'Functions',
    body: (
      <>
        A selection of functions useful for composition of digital twins. The
        functions for data processing and analysis scripts can be placed here.
      </>
    ),
  },
  {
    index: 1 as TabData['index'],
    label: 'Models',
    body: <>Digital twin models.</>,
  },
  {
    index: 2 as TabData['index'],
    label: 'Tools',
    body: <>Digital twin execution software.</>,
  },
  {
    index: 3 as TabData['index'],
    label: 'Data',
    body: <>Data sources for execution of digital twins.</>,
  },
  {
    index: 4 as TabData['index'],
    label: 'Digital Twins',
    body: <>Ready to use digital twins.</>,
  },
];

function LibComponents() {
  return <TabComponent tabs={tabs} />;
}

export default LibComponents;
