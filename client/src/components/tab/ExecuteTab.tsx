import React from 'react';
import { Grid, Box } from '@mui/material';
import ExecuteDigitalTwin from 'components/ExecuteDigitalTwin';
import { GitlabInstance, FolderEntry } from 'util/gitlab';

const ExecuteTab: React.FC<{ subfolders: FolderEntry[], gitlabInstance: GitlabInstance }> = props => (
  <Box sx={{ border: '1px solid black', padding: 2 }}>
    <Grid container spacing={2}>
      {props.subfolders.map((folder) => (
        <Grid item key={folder.path}>
          {props.gitlabInstance && (
            <ExecuteDigitalTwin name={folder.name}/>
          )}
        </Grid>
      ))}
    </Grid>
  </Box>
);

export default ExecuteTab;