import React from 'react';
import { Grid, Box, Typography } from '@mui/material';
import ExecuteDigitalTwin from 'route/digitaltwins/ExecuteDigitalTwin';
import { GitlabInstance, FolderEntry } from 'util/gitlab';

const ExecuteTab: React.FC<{
  subfolders: FolderEntry[];
  gitlabInstance: GitlabInstance;
  error: string | null;
}> = (props) => (
  <Box sx={{ border: '1px solid black', padding: 2 }}>
    {props.error ? (
      <Typography color="error">{props.error}</Typography>
    ) : (
      <Grid container spacing={2}>
        {props.subfolders.map((folder) => (
          <Grid item key={folder.path}>
            {props.gitlabInstance && <ExecuteDigitalTwin name={folder.name} />}
          </Grid>
        ))}
      </Grid>
    )}
  </Box>
);

export default ExecuteTab;
