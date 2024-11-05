import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { isFileDeletable, isFileModifiable } from 'preview/util/fileUtils';

function FileActionButtons({
  fileName,
  setOpenDeleteFileDialog,
  setOpenChangeFileNameDialog,
}: {
  fileName: string;
  setOpenDeleteFileDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setOpenChangeFileNameDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <Box sx={{ display: 'flex', gap: 1, paddingLeft: 2, marginTop: 5 }}>
      {isFileDeletable(fileName) && fileName && (
        <Button
          variant="contained"
          onClick={() => setOpenDeleteFileDialog(true)}
        >
          Delete File
        </Button>
      )}
      {isFileModifiable(fileName) && fileName && (
        <Button
          variant="contained"
          onClick={() => setOpenChangeFileNameDialog(true)}
        >
          Change File Name
        </Button>
      )}
    </Box>
  );
}

export default FileActionButtons;
