import * as React from 'react';
import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Typography } from '@mui/material';
import Layout from 'page/Layout';
import TabComponent from 'components/tab/TabComponent';
import { TabData } from 'components/tab/subcomponents/TabRender';
import AssetBoard from 'preview/components/asset/AssetBoard';
import GitlabInstance from 'preview/util/gitlab';
import { getAuthority } from 'util/envUtil';
import { setAssets } from 'preview/store/assets.slice';
import { Asset } from 'preview/components/asset/Asset';
import { addNewFile } from 'preview/store/file.slice';
import DigitalTwin from 'preview/util/gitlabDigitalTwin';
import { setDigitalTwin } from 'preview/store/digitalTwin.slice';
import tabs from './DigitalTwinTabDataPreview';
import CreateTab from './create/CreateTab';

export const createDTTab = (error: string | null): TabData[] =>
  tabs
    .filter((tab) => tab.label === 'Manage' || tab.label === 'Execute' || tab.label === 'Create')
    .map((tab) => ({
      label: tab.label,
      body: (
        <>
          {tab.label === 'Create' ? (
            <>
              <Typography variant="body1">{tab.body}</Typography>
              <CreateTab />
            </>
          ) : (
            <>
              <Typography variant="body1">{tab.body}</Typography>
              <AssetBoard tab={tab.label} error={error} />
            </>
          )}
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
  } catch (_error) {
    setError(`An error occurred`);
    return [];
  }
};

export const createDigitalTwinsForAssets = async (
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
    await digitalTwin.getDescription();
    dispatch(setDigitalTwin({ assetName: asset.name, digitalTwin }));
  });
};

export const DTContent = () => {
  const [error, setError] = useState<string | null>(null);
  const dispatch = useDispatch();

  useEffect(() => {
    const gitlabInstance = new GitlabInstance(
      sessionStorage.getItem('username') || '',
      getAuthority(),
      sessionStorage.getItem('access_token') || '',
    );
    fetchSubfolders(gitlabInstance, dispatch, setError).then((assets) => {
      if (assets) {
        createDigitalTwinsForAssets(assets, dispatch);
      }
    });
  }, [dispatch]);

  useEffect(() => {
      const defaultFiles = [
        { name: 'description.md', type: 'description' },
        { name: 'README.md', type: 'description' },
        { name: '.gitlab-ci.yml', type: 'config' },
      ];
      defaultFiles.forEach(file => {
        dispatch(addNewFile(file));
      });
  }, []);

  return (
    <Layout>
      <Typography variant="body1" style={{ marginBottom: 0 }}>
        This page demonstrates integration of DTaaS with gitlab CI/CD workflows.
        The feature is experimental and requires certain gitlab setup in order
        for it to work.
      </Typography>
      <TabComponent assetType={createDTTab(error)} scope={[]} />
    </Layout>
  );
};

export default function DigitalTwinsPreview() {
  return <DTContent />;
}
