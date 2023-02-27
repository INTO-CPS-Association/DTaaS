import * as React from 'react';
import TabComponent, { TabData } from 'components/tab/TabComponent';

const tabs: TabData[] = [
  {
    index: 0 as TabData['index'],
    label: 'Define',
    body: (
      <>
        Create multiple scenarios and potentially select the execution
        infrastructure.
      </>
    ),
  },
  {
    index: 1 as TabData['index'],
    label: 'Execute',
    body: <>Execution of scenarios and potential real-time interaction.</>,
  },
  {
    index: 2 as TabData['index'],
    label: 'Analyze',
    body: <>Execution summary, output data in text and graphical formats.</>,
  },
];

function Workflows() {
  return <TabComponent tabs={tabs} />;
}

export default Workflows;
