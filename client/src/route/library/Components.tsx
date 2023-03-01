/*
src: https://mui.com/material-ui/react-tabs/
*/
import * as React from 'react';
import TabComponent, { TabData } from 'components/tab/TabComponent';
import Iframe from 'components/Iframe';

const jupyterURL = process.env.REACT_APP_URL_LIB;

const tabs: TabData[] = [
  {
    index: 0 as TabData['index'],
    label: 'Functions',
    fullsize: true,
    body: (
      <>
        A selection of functions useful for composition of digital twins. The
        functions for data processing and analysis scripts can be placed here.
        <Iframe
          title="JupyterLight-Demo"
          url={jupyterURL || 'google.com'}
          fullsize={true}
        />
      </>
    ),
  },
  {
    index: 1 as TabData['index'],
    label: 'Models',
    fullsize: true,
    body: (
      <>
        Digital twin models.
        <Iframe
          title="JupyterLight-Demo"
          url={jupyterURL || 'google.com'}
          fullsize={true}
        />
      </>
    ),
  },
  {
    index: 2 as TabData['index'],
    label: 'Tools',
    fullsize: true,
    body: (
      <>
        Digital twin execution software.
        <Iframe
          title="JupyterLight-Demo"
          url={jupyterURL || 'google.com'}
          fullsize={true}
        />
      </>
    ),
  },
  {
    index: 3 as TabData['index'],
    label: 'Data',
    fullsize: true,
    body: (
      <>
        Data sources for execution of digital twins.
        <Iframe
          title="JupyterLight-Demo"
          url={jupyterURL || 'google.com'}
          fullsize={true}
        />
      </>
    ),
  },
  {
    index: 4 as TabData['index'],
    label: 'Digital Twins',
    fullsize: true,
    body: (
      <>
        Ready to use digital twins.
        <Iframe
          title="JupyterLight-Demo"
          url={jupyterURL || 'google.com'}
          fullsize={true}
        />
      </>
    ),
  },
];

function LibComponents() {
  return <TabComponent tabs={tabs} />;
}

export default LibComponents;
