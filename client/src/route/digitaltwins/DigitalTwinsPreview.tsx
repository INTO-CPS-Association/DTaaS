import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Typography } from '@mui/material';
import Layout from 'page/Layout';
import TabComponent from 'components/tab/TabComponent';
import { TabData } from 'components/tab/subcomponents/TabRender';
import AssetBoard from 'components/asset/AssetBoard';
import {
  defaultFiles,
  addOrUpdateFile,
} from '@into-cps-association/dt-automation';
import tabs from 'route/digitaltwins/DigitalTwinTabDataPreview';
import PageShell from 'components/PageShell';
import CreatePage from 'route/digitaltwins/create/CreatePage';
import VisualiseTab from 'route/digitaltwins/visualise/VisualiseTab';

interface DTTabProps {
  readonly newDigitalTwinName: string;
  readonly setNewDigitalTwinName: React.Dispatch<React.SetStateAction<string>>;
}

// The tabs in the order they are shown. Analyze stays in the tab data for
// the workspace page and is not part of this page.
const shownTabs = ['Execute', 'View', 'Manage', 'Create'];

function tabContent(label: string, props: DTTabProps): React.ReactNode {
  if (label === 'Create') {
    return (
      <CreatePage
        newDigitalTwinName={props.newDigitalTwinName}
        setNewDigitalTwinName={props.setNewDigitalTwinName}
      />
    );
  }
  if (label === 'View') return <VisualiseTab />;
  return <AssetBoard tab={label} />;
}

export const createDTTab = (props: DTTabProps): TabData[] =>
  tabs
    .filter((tab) => shownTabs.includes(tab.label))
    .map((tab) => ({
      label: tab.label,
      loggerContext: { dt: { tab: tab.label.toLowerCase() } },
      body: (
        <>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {tab.body}
          </Typography>
          {tabContent(tab.label, props)}
        </>
      ),
    }));

export const DTContent = () => {
  const [newDigitalTwinName, setNewDigitalTwinName] = useState('');
  const dispatch = useDispatch();

  useEffect(() => {
    defaultFiles.forEach((file) => {
      dispatch(
        addOrUpdateFile({
          name: file.name,
          content: '',
          isNew: true,
          isModified: false,
        }),
      );
    });
  }, [dispatch]);

  return (
    <Layout>
      <PageShell
        title="Digital Twins Page"
        description="This page demonstrates integration of DTaaS with GitLab CI/CD workflows. The feature is experimental and requires certain GitLab setup in order for it to work."
      >
        <TabComponent
          assetType={createDTTab({ newDigitalTwinName, setNewDigitalTwinName })}
          scope={[]}
        />
      </PageShell>
    </Layout>
  );
};

export default function DigitalTwinsPreview() {
  return <DTContent />;
}
