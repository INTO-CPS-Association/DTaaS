import * as React from 'react';
// import Box from '@mui/material/Box';
import Iframe from 'components/Iframe';
import TabComponent, { TabData } from 'components/tab/TabComponent';

function Workflows() {
  // TODO: URL should depend on the selected tab. Get from .env
  const jupyterURL =
    'https://jupyterlite.github.io/demo/repl/index.html?kernel=javascript&toolbar=';

  const tabs: TabData[] = [
    {
      index: 0 as TabData['index'],
      fullsize: true,
      label: 'Create',
      body: (
        <> 
          Create digital twins from available library components. The text and
          graphical configuration of digital twins happen here.
          <Iframe title="JupyterLight-Demo" url={jupyterURL} fullsize={true} />
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
      body: (
        <>
          Execution summary, output data in text and graphical formats.
        </>
      ),
    },
  ];

  return <TabComponent tabs={tabs}/>;
}

export default Workflows;
