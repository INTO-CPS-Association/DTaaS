/*
src: https://mui.com/material-ui/react-tabs/
*/
import * as React from 'react';
import TabComponent, {
  TabData,
  createTabData,
} from 'components/tab/TabComponent';
import Iframe from 'components/Iframe';
import tabs from './ComponentsData';

const jupyterURL = window.env.REACT_APP_URL_LIB;

const tabsData: TabData[] = createTabData(
  tabs.map((tab) => ({
    label: tab.label,
    body: (
      <>
        {tab.body}
        <Iframe
          title={`JupyterLight-Demo-${tab.label}`}
          url={`${jupyterURL}`}
          fullsize
        />
      </>
    ),
  })),
  true
);

function LibComponents() {
  return <TabComponent tabs={tabsData} />;
}

export default LibComponents;
