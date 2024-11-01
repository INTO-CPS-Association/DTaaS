import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { isFileDeletable, isFileModifiable } from 'preview/util/fileUtils';

function FileActionButtons({
  fileName,
  onDeleteClick,
  onChangeFileNameClick,
}: {
  fileName: string;
  onDeleteClick: () => void;
  onChangeFileNameClick: () => void;
}) {
  return (
    <Box sx={{ display: 'flex', gap: 1, paddingLeft: 2, marginTop: 5 }}>
      {isFileDeletable(fileName) && fileName && (
        <Button variant="contained" onClick={onDeleteClick}>
          Delete File
        </Button>
      )}
      {isFileModifiable(fileName) && fileName && (
        <Button variant="contained" onClick={onChangeFileNameClick}>
          Change File Name
        </Button>
      )}
    </Box>
  );
}

export default FileActionButtons;
