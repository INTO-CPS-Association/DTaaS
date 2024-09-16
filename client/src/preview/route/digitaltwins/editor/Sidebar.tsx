/* eslint-disable no-console */
import * as React from 'react';
import { useState, useEffect, SetStateAction, Dispatch } from 'react';
import { Grid, Typography } from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import DigitalTwin from 'util/gitlabDigitalTwin';
import { useSelector } from 'react-redux';
import { selectDigitalTwinByName } from 'store/digitalTwin.slice';

interface DataItem {
  id: string;
  name: string;
}

const fetchData = async (
  digitalTwin: DigitalTwin,
  setDescriptionData: Dispatch<SetStateAction<DataItem[]>>,
  setConfigData: Dispatch<SetStateAction<DataItem[]>>,
) => {
  const configResponse = [
    { id: '1', name: 'Digital Twin' },
    { id: '2', name: 'Asset1' },
    { id: '3', name: 'Asset2' },
  ];
  setConfigData(configResponse);
  setDescriptionData(
    digitalTwin.descriptionFiles.map((name) => ({ id: name, name })),
  );
};

const Sidebar = () => {
  const [descriptionData, setDescriptionData] = useState<DataItem[]>([]);
  const [configData, setConfigData] = useState<DataItem[]>([]);
  const digitalTwin = useSelector(
    selectDigitalTwinByName('mass-spring-damper'),
  );

  useEffect(() => {
    fetchData(digitalTwin, setDescriptionData, setConfigData);
  }, [digitalTwin]);

  return (
    <Grid
      container
      direction="column"
      sx={{ padding: 2, height: '100%', maxWidth: '300px' }} // Set the maxWidth or width here
    >
      {/* Description Tree */}
      <Typography variant="h6" gutterBottom>
        Description
      </Typography>
      <SimpleTreeView>
        {descriptionData.map((item) => (
          <TreeItem key={item.id} itemId={item.id} label={item.name} />
        ))}
      </SimpleTreeView>

      {/* Config Tree */}
      <Typography variant="h6" gutterBottom sx={{ marginTop: 2 }}>
        Config
      </Typography>
      <SimpleTreeView>
        {configData.map((item) => (
          <TreeItem key={item.id} itemId={item.id} label={item.name}>
            {item.name.startsWith('Service') && (
              <TreeItem
                itemId={`${item.id}-service`}
                label={`More info for ${item.name}`}
              />
            )}
          </TreeItem>
        ))}
      </SimpleTreeView>
    </Grid>
  );
};

export default Sidebar;
