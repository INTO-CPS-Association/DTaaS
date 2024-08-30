import React, { useState, useEffect } from 'react';
import { Typography } from '@mui/material';
import Layout from 'page/Layout';
import TabComponent from 'components/tab/TabComponent';
import { TabData } from 'components/tab/subcomponents/TabRender';
import { Asset } from 'components/asset/Asset';
import AssetBoard from 'components/asset/AssetBoard';

import tabs from './DigitalTwinTabData';
import GitlabService from './GitlabService';

function DTContent() {
  const [subfolders, setSubfolders] = useState<Asset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const gitlabService = new GitlabService();

  useEffect(() => {
    const fetchSubfolders = async () => {
      const result = await gitlabService.getSubfolders();
      if (typeof result === 'string') {
        setError(result);
      } else {
        setSubfolders(result);
      }
    };

    fetchSubfolders();
  }, []);

  const DTTab: TabData[] = tabs
    .filter((tab) => tab.label === 'Execute')
    .map((tab) => ({
      label: tab.label,
      body: (
        <>
          <Typography variant="body1">{tab.body}</Typography>
          {gitlabService.getInstance() && (
            <AssetBoard
              subfolders={subfolders}
              gitlabInstance={gitlabService.getInstance()}
              error={error}
            />
          )}
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
