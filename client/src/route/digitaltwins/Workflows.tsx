import * as React from 'react';
import Iframe from 'components/Iframe';
import TabComponent, { TabData } from 'components/tab/TabComponent';

const jupyterURL = process.env.REACT_APP_URL_DT;

const tabs: TabData[] = [
  {
    index: 0 as TabData['index'],
    fullsize: true,
    label: 'Create',
    body: (
      <>
        Create digital twins from available library components. The text and
        graphical configuration of digital twins happen here.
        <Iframe title="JupyterLight-Demo" url={jupyterURL || 'google.com'} fullsize={true} />
      </>
    ),
  },
  {
    index: 1 as TabData['index'],
    label: 'Execute',
    body: (
      <>
        Execute the digital twins with the DTaaS performing the automated
        deployment and execution. Potential realtime interactions must be
        possible. There should be an accordion of DT summary, Visualization,
        Output, Logs.
      </>
    ),
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
