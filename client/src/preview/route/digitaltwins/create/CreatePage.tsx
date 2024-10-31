import * as React from 'react';
import { Dispatch, SetStateAction, useState } from 'react';
import { Box, Button, TextField } from '@mui/material';
import Editor from 'preview/route/digitaltwins/editor/Editor';
import CreateDialogs from './CreateDialogs';
import CustomSnackbar from '../Snackbar';
import FileActionButtons from './FileActionButtons';

interface CreatePageProps {
  newDigitalTwinName: string;
  setNewDigitalTwinName: Dispatch<SetStateAction<string>>;
}

function DigitalTwinNameInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <Box sx={{ display: 'flex', width: '35%', marginTop: 5 }}>
      <TextField
        fullWidth
        variant="outlined"
        label="Digital twin name"
        value={value}
        onChange={onChange}
      />
    </Box>
  );
}

function ActionButtons({
  onCancel,
  onSave,
  isSaveDisabled,
}: {
  onCancel: () => void;
  onSave: () => void;
  isSaveDisabled: boolean;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'flex-end',
        width: '100%',
        marginBottom: 2,
        gap: 1,
      }}
    >
      <Button variant="outlined" onClick={onCancel}>
        Cancel
      </Button>
      <Button
        variant="contained"
        color="primary"
        onClick={onSave}
        disabled={isSaveDisabled}
      >
        Save
      </Button>
    </Box>
  );
}

function CreatePage({
  newDigitalTwinName,
  setNewDigitalTwinName,
}: CreatePageProps) {
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileType, setFileType] = useState('');
  const [openChangeFileNameDialog, setOpenChangeFileNameDialog] =
    useState(false);
  const [openDeleteFileDialog, setOpenDeleteFileDialog] = useState(false);
  const [openConfirmDeleteDialog, setOpenConfirmDeleteDialog] = useState(false);
  const [openCreateDTDialog, setOpenCreateDTDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const confirmCancel = () => {
    setOpenConfirmDeleteDialog(true);
  };

  const confirmSave = () => {
    setErrorMessage('');
    setOpenCreateDTDialog(true);
  };

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          margintTop: 5,
        }}
      >
        <FileActionButtons
          fileName={fileName}
          onDeleteClick={() => setOpenDeleteFileDialog(true)}
          onChangeFileNameClick={() => setOpenChangeFileNameDialog(true)}
        />
        <DigitalTwinNameInput
          value={newDigitalTwinName}
          onChange={(e) => setNewDigitalTwinName(e.target.value)}
        />
      </Box>

      <Box sx={{ width: '100%', marginTop: -2 }}>
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

      <ActionButtons
        onCancel={confirmCancel}
        onSave={confirmSave}
        isSaveDisabled={!newDigitalTwinName}
      />

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
        openCreateDTDialog={openCreateDTDialog}
        setOpenCreateDTDialog={setOpenCreateDTDialog}
        newDigitalTwinName={newDigitalTwinName}
        setNewDigitalTwinName={setNewDigitalTwinName}
        errorMessage={errorMessage}
        setErrorMessage={setErrorMessage}
      />
      <CustomSnackbar />
    </>
  );
}

export default CreatePage;
