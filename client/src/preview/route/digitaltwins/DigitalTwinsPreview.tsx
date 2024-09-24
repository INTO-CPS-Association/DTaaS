import * as React from 'react';
import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Typography } from '@mui/material';
import Layout from 'page/Layout';
import TabComponent from 'components/tab/TabComponent';
import { TabData } from 'components/tab/subcomponents/TabRender';
import AssetBoard from 'preview/components/asset/AssetBoard';
import { GitlabInstance } from 'util/gitlab';
import { getAuthority } from 'util/envUtil';
import { setAssets } from 'store/assets.slice';
import { Asset } from 'preview/components/asset/Asset';
import DigitalTwin from 'util/gitlabDigitalTwin';
import { setDigitalTwin } from 'store/digitalTwin.slice';
import tabs from './DigitalTwinTabDataPreview';

export const createDTTab = (error: string | null): TabData[] =>
  tabs
    .filter((tab) => tab.label === 'Execute')
    .map((tab) => ({
      label: tab.label,
      body: (
        <>
          <Typography variant="body1">{tab.body}</Typography>
          <AssetBoard tab={tab.label} error={error} />
        </>
      ),
    }));

export const fetchSubfolders = async (
  gitlabInstance: GitlabInstance,
  dispatch: ReturnType<typeof useDispatch>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
) => {
  try {
    await gitlabInstance.init();
    if (gitlabInstance.projectId) {
      const subfolders = await gitlabInstance.getDTSubfolders(
        gitlabInstance.projectId,
      );
      dispatch(setAssets(subfolders));
      return subfolders;
    }
    dispatch(setAssets([]));
    return [];
  } catch (error) {
    setError('An error occurred');
    return [];
  }
};

const createDigitalTwinsForAssets = (
  assets: Asset[],
  dispatch: ReturnType<typeof useDispatch>,
) => {
  assets.forEach(async (asset) => {
    const gitlabInstance = new GitlabInstance(
      sessionStorage.getItem('username') || '',
      getAuthority(),
      sessionStorage.getItem('access_token') || '',
    );
    await gitlabInstance.init();
    const digitalTwin = new DigitalTwin(asset.name, gitlabInstance);
    dispatch(setDigitalTwin({ assetName: asset.name, digitalTwin }));
  });
};

export const DTContent = () => {
  const [error, setError] = useState<string | null>(null);
  const dispatch = useDispatch();
  const gitlabInstance = new GitlabInstance(
    sessionStorage.getItem('username') || '',
    getAuthority(),
    sessionStorage.getItem('access_token') || '',
  );

  useEffect(() => {
    fetchSubfolders(gitlabInstance, dispatch, setError).then((assets) => {
      if (assets) {
        createDigitalTwinsForAssets(assets, dispatch);
      }
    });
  }, [dispatch]);

  return (
    <Layout>
      <TabComponent assetType={createDTTab(error)} scope={[]} />
    </Layout>
  );
};

export default function DigitalTwinsPreview() {
  return <DTContent />;
}
