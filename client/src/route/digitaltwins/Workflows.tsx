import * as React from 'react';
import Iframe from 'components/Iframe';
import TabComponent from 'components/tab/TabComponent';
import { TabData } from 'components/tab/subcomponents/TabRender';
import tabs from './WorkflowsData';

const jupyterURL = window.env.REACT_APP_URL_DT;

const tabData: TabData[] = tabs.map((tab, i) => ({
  label: tab.label,
  body: (
    <>
      {tab.body}
      {i === 0 && (
        <Iframe
          title={`JupyterLight-Demo-${tab.label}`}
          url={jupyterURL}
          fullsize
        />
      )}
    </>
  ),
}));
function Workflows() {
  return <TabComponent tabs={tabData} />;
}

export default Workflows;
