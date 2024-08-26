import React, { useState, useEffect } from 'react';
import { Typography } from '@mui/material';
import Layout from 'page/Layout';
import TabComponent from 'components/tab/TabComponent';
import Iframe from 'components/Iframe';
import { TabData } from 'components/tab/subcomponents/TabRender';
import { useURLforDT } from 'util/envUtil';
import { GitlabInstance, FolderEntry } from 'util/gitlab';
import tabs from './DigitalTwinTabData';
import ExecuteTab from '../../components/tab/ExecuteTab';

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

  const DTTab: TabData[] = tabs.map((tab) => ({
    label: tab.label,
    body: (
      <>
        {tab.label === 'Execute' ? (
          <>
            <Typography variant="body1">{tab.body}</Typography>
            {gitlabInstance && <ExecuteTab subfolders={subfolders} gitlabInstance={gitlabInstance} />}
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

export default DTContent;