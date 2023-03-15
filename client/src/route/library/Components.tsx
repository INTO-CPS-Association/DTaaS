/*
src: https://mui.com/material-ui/react-tabs/
*/
import * as React from 'react';
import TabComponent, {
  TabData,
  createTabData,
} from 'components/tab/TabComponent';
import Iframe from 'components/Iframe';

const jupyterURL = window.env.REACT_APP_URL_LIB;

const tabs: TabData[] = createTabData(
  [
    {
      label: 'Functions',
      body: (
        <>
          A selection of functions useful for composition of digital twins. The
          functions for data processing and analysis scripts can be placed here.
          <Iframe
            title="JupyterLight-Demo"
            url={`${jupyterURL}&Functions`}
            fullsize={true}
          />
        </>
      ),
    },
    {
      label: 'Models',
      body: (
        <>
          Digital twin models.
          <Iframe
            title="JupyterLight-Demo"
            url={`${jupyterURL}&Models`}
            fullsize={true}
          />
        </>
      ),
    },
    {
      label: 'Tools',
      body: (
        <>
          Digital twin execution software.
          <Iframe
            title="JupyterLight-Demo"
            url={`${jupyterURL}&Tools`}
            fullsize={true}
          />
        </>
      ),
    },
    {
      label: 'Data',
      body: (
        <>
          Data sources for execution of digital twins.
          <Iframe
            title="JupyterLight-Demo"
            url={`${jupyterURL}&Data`}
            fullsize={true}
          />
        </>
      ),
    },
    {
      label: 'Digital Twins',
      body: (
        <>
          Ready to use digital twins.
          <Iframe
            title="JupyterLight-Demo"
            url={`${jupyterURL}&Digital_Twins`}
            fullsize={true}
          />
        </>
      ),
    },
  ],
  true
);

function LibComponents() {
  return <TabComponent tabs={tabs} />;
}

export default LibComponents;
