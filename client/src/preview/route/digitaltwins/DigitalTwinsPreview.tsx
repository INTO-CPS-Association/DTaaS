import * as React from 'react';
import { useState, useEffect } from 'react';
import { Typography } from '@mui/material';
import Layout from 'page/Layout';
import TabComponent from 'components/tab/TabComponent';
import { TabData } from 'components/tab/subcomponents/TabRender';
import { Asset } from 'preview/components/asset/Asset';
import AssetBoard from 'preview/components/asset/AssetBoard';
import { GitlabInstance } from 'util/gitlab';
import { getAuthority } from 'util/envUtil';
import tabs from '../../../route/digitaltwins/DigitalTwinTabData';

const createDTTab = (
  subfolders: Asset[],
  error: string | null,
  gitlabInstance: GitlabInstance,
): TabData[] =>
  tabs
    .filter((tab) => tab.label === 'Manage' || tab.label === 'Execute')
    .map((tab) => ({
      label: tab.label,
      body: (
        <>
          <Typography variant="body1">{tab.body}</Typography>
          <AssetBoard
            tab={tab.label}
            subfolders={subfolders}
            gitlabInstance={gitlabInstance}
            error={error}
          />
        </>
      ),
    }));

export const fetchSubfolders = async (
  gitlabInstance: GitlabInstance,
  setSubfolders: React.Dispatch<React.SetStateAction<Asset[]>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
) => {
  try {
    await gitlabInstance.init();
    if (gitlabInstance.projectId) {
      const subfolders = await gitlabInstance.getDTSubfolders(
        gitlabInstance.projectId,
      );
      setSubfolders(subfolders);
    } else {
      setSubfolders([]);
    }
  } catch (error) {
    setError('An error occurred');
  }
};

function DTContent() {
  const [subfolders, setSubfolders] = useState<Asset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const gitlabInstance = new GitlabInstance(
    sessionStorage.getItem('username') || '',
    getAuthority(),
    sessionStorage.getItem('access_token') || '',
  );

  useEffect(() => {
    fetchSubfolders(gitlabInstance, setSubfolders, setError);
  }, []);

  return (
    <Layout>
      <TabComponent
        assetType={createDTTab(subfolders, error, gitlabInstance)}
        scope={[]}
      />
    </Layout>
  );
}

export default DTContent;
