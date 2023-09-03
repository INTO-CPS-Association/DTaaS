import * as React from 'react';

interface TabRenderProps {
  index: number;
  children: TabData;
}

export interface TabData {
  label: string;
  body: JSX.Element;
}

function TabRender(props: TabRenderProps) {
  const { children: tab, index } = props;

  return (
    <div
      role="tabpanel"
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
      }}
    >
      {tab.body}
    </div>
  );
}

export default TabRender;
