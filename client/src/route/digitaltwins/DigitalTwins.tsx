import Layout from 'page/Layout';
import TabComponent from 'components/tab/TabComponent';
import Iframe from 'components/Iframe';
import { TabData } from 'components/tab/subcomponents/TabRender';
import { useURLforDT } from 'util/envUtil';
import tabs from 'route/digitaltwins/DigitalTwinTabData';
import PageShell from 'components/PageShell';
import TabDescription from 'components/tab/TabDescription';

function DTContent() {
  const DTurl = useURLforDT();

  const DTTab: TabData[] = tabs.map((tab) => ({
    label: tab.label,
    body: (
      <>
        <TabDescription>{tab.body}</TabDescription>
        <Iframe title={`JupyterLight-Demo-${tab.label}`} url={DTurl} />
      </>
    ),
  }));

  return (
    <Layout>
      <PageShell
        title="Digital Twins"
        description="Create, run and analyse the digital twins in your workspace."
      >
        <TabComponent assetType={DTTab} scope={[]} />
      </PageShell>
    </Layout>
  );
}

export default function DigitalTwins() {
  return <DTContent />;
}
