import Layout from 'page/Layout';
import TabComponent from 'components/tab/TabComponent';
import Iframe from 'components/Iframe';
import { TabData } from 'components/tab/subcomponents/TabRender';
import { useURLforDT } from 'util/envUtil';
import { Typography } from '@mui/material';
import tabs from 'route/digitaltwins/DigitalTwinTabData';

function DTContent() {
  const DTurl = useURLforDT();

  const DTTab: TabData[] = tabs.map((tab) => ({
    label: tab.label,
    body: (
      <>
        <Typography variant="body1">{tab.body}</Typography>
        <>
          {' '}
          <Iframe title={`JupyterLight-Demo-${tab.label}`} url={DTurl} />{' '}
        </>
      </>
    ),
  }));

  return (
    <Layout sx={{ display: 'flex' }}>
      <TabComponent assetType={DTTab} scope={[]} />
    </Layout>
  );
}

export default function DigitalTwins() {
  return <DTContent />;
}
