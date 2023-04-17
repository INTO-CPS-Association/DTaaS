import * as React from 'react';
import TabComponent from 'components/tab/TabComponent';
import { TabData } from 'components/tab/subcomponents/TabRender';

const tabs: TabData[] = [
  {
    label: 'Define',
    body: (
      <>
        Create multiple scenarios and potentially select the execution
        infrastructure.
      </>
    ),
  },
  {
    label: 'Execute',
    body: <>Execution of scenarios and potential real-time interaction.</>,
  },
  {
    label: 'Analyze',
    body: <>Execution summary, output data in text and graphical formats.</>,
  },
];

function Workflows() {
  return <TabComponent tabs={tabs} />;
}

export default Workflows;
