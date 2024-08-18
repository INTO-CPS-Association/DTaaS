import * as React from 'react';
import { useState, useEffect } from 'react';
import Layout from 'page/Layout';
import TabComponent from 'components/tab/TabComponent';
import Iframe from 'components/Iframe';
import DigitalTwinCard from 'components/DigitalTwinCard';
import { TabData } from 'components/tab/subcomponents/TabRender';
import { useURLforDT } from 'util/envUtil';
import { Typography, Grid, Box } from '@mui/material';
import { GitlabInstance, FolderEntry } from 'util/gitlab';
import tabs from './DigitalTwinTabData';

function DTContent() {
  const [subfolders, setSubfolders] = useState<FolderEntry[]>([]);
  const [gitlabInstance, setGitlabInstance] = useState<GitlabInstance | null>(null);
  const DTurl = useURLforDT();

  const fetchSubfolders = async () => {
    const instance = new GitlabInstance();
    setGitlabInstance(instance);
    const projectId = await instance.getProjectId();
    if (projectId) {
      const subfoldersData = await instance.getDTSubfolders(projectId);
      setSubfolders(subfoldersData);
    }
  };

  useEffect(() => {
    fetchSubfolders();
  }, []);

  const ExecuteComponent = () => (
    <Box sx={{ border: '1px solid black', padding: 2 }}>
      <Grid container spacing={2}>
        {subfolders.map((folder) => (
          <Grid item key={folder.path}>
            {gitlabInstance && (
              <DigitalTwinCard name={folder.name} gitlabInstance={gitlabInstance} />
            )}
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const DTTab: TabData[] = tabs.map((tab) => ({
    label: tab.label,
    body: (
      <>
        {tab.label === 'Execute' ? (
          <>
            <Typography variant="body1">{tab.body}</Typography>
            <ExecuteComponent />
          </>
        ) : (
          <>
            <Typography variant="body1">{tab.body}</Typography>
            <Iframe title={`JupyterLight-Demo-${tab.label}`} url={DTurl} />
          </>
        )}
      </>
    ),
  }));

  return (
    <Layout>
      <TabComponent assetType={DTTab} scope={[]} />
    </Layout>
  );
}

export default function DigitalTwins() {
  return <DTContent />;
}
