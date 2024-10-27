import * as React from 'react';
import { useState } from 'react';
import { Box, Button, TextField } from '@mui/material';
import Editor from 'preview/route/digitaltwins/editor/Editor';
import CreateDialogs from './CreateDialogs';
import CustomSnackbar from '../Snackbar';

function CreatePage() {
  const [newDigitalTwinName, setNewDigitalTwinName] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileType, setFileType] = useState('');
  const [openChangeFileNameDialog, setOpenChangeFileNameDialog] =
    useState(false);
  const [openDeleteFileDialog, setOpenDeleteFileDialog] = useState(false);
  const [openConfirmDeleteDialog, setOpenConfirmDeleteDialog] = useState(false);
  const [openInputDialog, setOpenInputDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isFileModifiable = () =>
    !['README.md', 'description.md', '.gitlab-ci.yml'].includes(fileName);

  const isFileDeletable = () => !['.gitlab-ci.yml'].includes(fileName);

  const confirmCancel = () => {
    setOpenConfirmDeleteDialog(true);
  };

  const confirmSave = () => {
    setErrorMessage('');
    setOpenInputDialog(true);
  };

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          marginTop: 5,
        }}
      >
        <Box sx={{ display: 'flex', gap: 1, paddingLeft: 2 }}>
          {isFileDeletable() && fileName && (
            <Button
              variant="contained"
              onClick={() => setOpenDeleteFileDialog(true)}
            >
              Delete File
            </Button>
          )}
          {isFileModifiable() && fileName && (
            <Button
              variant="contained"
              onClick={() => setOpenChangeFileNameDialog(true)}
            >
              Change File Name
            </Button>
          )}
        </Box>

        <Box sx={{ display: 'flex', width: '35%' }}>
          <TextField
            fullWidth
            variant="outlined"
            label="Digital twin name"
            value={newDigitalTwinName}
            onChange={(e) => setNewDigitalTwinName(e.target.value)}
          />
        </Box>
      </Box>

      <Box sx={{ width: '100%', marginTop: -1 }}>
        <Editor
          tab="create"
          fileName={fileName}
          setFileName={setFileName}
          fileContent={fileContent}
          setFileContent={setFileContent}
          fileType={fileType}
          setFileType={setFileType}
        />
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          width: '100%',
          marginTop: 0.5,
          marginBottom: 2,
          gap: 1,
        }}
      >
        <Button variant="outlined" onClick={confirmCancel}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={confirmSave}
          disabled={!newDigitalTwinName}
        >
          Save
        </Button>
      </Box>

      <CreateDialogs
        openChangeFileNameDialog={openChangeFileNameDialog}
        onCloseChangeFileNameDialog={() => setOpenChangeFileNameDialog(false)}
        fileName={fileName}
        setFileName={setFileName}
        setFileContent={setFileContent}
        setFileType={setFileType}
        openDeleteFileDialog={openDeleteFileDialog}
        onCloseDeleteFileDialog={() => setOpenDeleteFileDialog(false)}
        openConfirmDeleteDialog={openConfirmDeleteDialog}
        setOpenConfirmDeleteDialog={setOpenConfirmDeleteDialog}
        openInputDialog={openInputDialog}
        setOpenInputDialog={setOpenInputDialog}
        newDigitalTwinName={newDigitalTwinName}
        errorMessage={errorMessage}
        setErrorMessage={setErrorMessage}
      />
      <CustomSnackbar />
    </>
  );
}

export default CreatePage;
