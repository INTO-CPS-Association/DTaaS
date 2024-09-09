import React, { useState, useEffect } from 'react';
import { Typography } from '@mui/material';
import Layout from 'page/Layout';
import TabComponent from 'components/tab/TabComponent';
import { TabData } from 'components/tab/subcomponents/TabRender';
import { Asset } from 'components/asset/Asset';
import AssetBoard from 'components/asset/AssetBoard';
import tabs from './DigitalTwinTabData';
import GitlabService from './GitlabService';

const createDTTab = (
  subfolders: Asset[],
  error: string | null,
  gitlabInstance: GitlabService,
): TabData[] => tabs
    .filter((tab) => tab.label === 'Execute')
    .map((tab) => ({
      label: tab.label,
      body: (
        <>
          <Typography variant="body1">{tab.body}</Typography>
          <AssetBoard
            subfolders={subfolders}
            gitlabInstance={gitlabInstance.getInstance()}
            error={error}
          />
        </>
      ),
    }));

const fetchSubfolders = async (
  gitlabService: GitlabService,
  setSubfolders: React.Dispatch<React.SetStateAction<Asset[]>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
) => {
  const result = await gitlabService.getSubfolders();
  if (typeof result === 'string') {
    setError(result);
  } else {
    setSubfolders(result);
  }
};

function DTContent() {
  const [subfolders, setSubfolders] = useState<Asset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const gitlabService = new GitlabService();

  useEffect(() => {
    fetchSubfolders(gitlabService, setSubfolders, setError);
  }, [gitlabService]);

  return (
    <Layout>
      <TabComponent
        assetType={createDTTab(subfolders, error, gitlabService)}
        scope={[]}
      />
    </Layout>
  );
}

export default DTContent;
