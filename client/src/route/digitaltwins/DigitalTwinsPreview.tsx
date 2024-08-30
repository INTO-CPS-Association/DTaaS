import React, { useState, useEffect } from 'react';
import { Typography } from '@mui/material';
import Layout from 'page/Layout';
import TabComponent from 'components/tab/TabComponent';
import { TabData } from 'components/tab/subcomponents/TabRender';
import { GitlabInstance, FolderEntry } from 'util/gitlab';
import { getAuthority } from 'util/envUtil';
import tabs from './DigitalTwinTabData';
import ExecuteTab from './ExecuteTab';

const DTContent: React.FC = () => {
  const [subfolders, setSubfolders] = useState<FolderEntry[]>([]);
  const [gitlabInstance, setGitlabInstance] = useState<GitlabInstance | null>(null);

  const fetchSubfolders = async () => {
    const instance = new GitlabInstance(sessionStorage.getItem('username') || '', getAuthority(), sessionStorage.getItem('access_token') || '');
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

  const DTTab: TabData[] = tabs
    .filter((tab) => tab.label === 'Execute')
    .map((tab) => ({
      label: tab.label,
      body: (
        <>
          <Typography variant="body1">{tab.body}</Typography>
          {gitlabInstance && <ExecuteTab subfolders={subfolders} gitlabInstance={gitlabInstance} />}
        </>
      ),
    }));

  return (
    <Layout>
      <TabComponent assetType={DTTab} scope={[]} />
    </Layout>
  );
};

export default DTContent;