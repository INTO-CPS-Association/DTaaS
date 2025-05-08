import * as React from 'react';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Typography } from '@mui/material';
import Layout from 'page/Layout';
import TabComponent from 'components/tab/TabComponent';
import { TabData } from 'components/tab/subcomponents/TabRender';
import AssetBoard from 'preview/components/asset/AssetBoard';
import { defaultFiles } from 'model/backend/gitlab/constants';
import { addOrUpdateFile } from 'preview/store/file.slice';
import tabs from './DigitalTwinTabDataPreview';
import CreatePage from './create/CreatePage';

interface DTTabProps {
  newDigitalTwinName: string;
  setNewDigitalTwinName: React.Dispatch<React.SetStateAction<string>>;
}

export const createDTTab = ({
  newDigitalTwinName,
  setNewDigitalTwinName,
}: DTTabProps): TabData[] =>
  tabs
    .filter(
      (tab) =>
        tab.label === 'Manage' ||
        tab.label === 'Execute' ||
        tab.label === 'Create',
    )
    .map((tab) => ({
      label: tab.label,
      body:
        tab.label === 'Create' ? (
          <>
            <Typography variant="body1">{tab.body}</Typography>
            <CreatePage
              newDigitalTwinName={newDigitalTwinName}
              setNewDigitalTwinName={setNewDigitalTwinName}
            />
          </>
        ) : (
          <>
            <Typography variant="body1">{tab.body}</Typography>
            <AssetBoard tab={tab.label} />
          </>
        ),
    }));

export const DTContent = () => {
  const [newDigitalTwinName, setNewDigitalTwinName] = React.useState('');
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
      <Typography variant="body1" sx={{ marginBottom: 0 }}>
        This page demonstrates integration of DTaaS with GitLab CI/CD workflows.
        The feature is experimental and requires certain GitLab setup in order
        for it to work.
      </Typography>
      <TabComponent
        assetType={createDTTab({ newDigitalTwinName, setNewDigitalTwinName })}
        scope={[]}
      />
    </Layout>
  );
};

export default function DigitalTwinsPreview() {
  return <DTContent />;
}
