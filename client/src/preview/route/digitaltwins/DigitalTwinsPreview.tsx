import * as React from 'react';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Typography } from '@mui/material';
import Layout from 'page/Layout';
import TabComponent from 'components/tab/TabComponent';
import { TabData } from 'components/tab/subcomponents/TabRender';
import AssetBoard from 'preview/components/asset/AssetBoard';
import { addNewFile } from 'preview/store/file.slice';
import tabs from './DigitalTwinTabDataPreview';
import Editor from './editor/Editor';

export const createDTTab = (): TabData[] =>
  tabs
    .filter((tab) => tab.label === 'Manage' || tab.label === 'Execute' || tab.label === 'Create')
    .map((tab) => ({
      label: tab.label,
      body: (
        <>
          {tab.label === 'Create' ? (
            <>
              <Typography variant="body1">{tab.body}</Typography>
              <Editor tab={'create'}/>
            </>
          ) : (
            <>
              <Typography variant="body1">{tab.body}</Typography>
              <AssetBoard tab={tab.label}/>
            </>
          )}
        </>
      ),
    }));

export const DTContent = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const defaultFiles = [
      { name: 'description.md', type: 'description' },
      { name: 'README.md', type: 'description' },
      { name: '.gitlab-ci.yml', type: 'config' },
    ];
    defaultFiles.forEach((file) => {
      dispatch(addNewFile(file));
    });
  }, [dispatch]);

  return (
    <Layout>
      <Typography variant="body1" style={{ marginBottom: 0 }}>
        This page demonstrates integration of DTaaS with gitlab CI/CD workflows.
        The feature is experimental and requires certain gitlab setup in order
        for it to work.
      </Typography>
      <TabComponent assetType={createDTTab()} scope={[]} />
    </Layout>
  );
};

export default function DigitalTwinsPreview() {
  return <DTContent />;
}
