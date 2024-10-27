import * as React from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  Typography,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import {
  addNewFile,
  deleteFile,
  FileState,
  removeAllCreationFiles,
  renameFile,
} from 'preview/store/file.slice';
import { useEffect } from 'react';
import { RootState } from 'store/store';
import GitlabInstance from 'preview/util/gitlab';
import { getAuthority } from 'util/envUtil';
import DigitalTwin from 'preview/util/gitlabDigitalTwin';
import { showSnackbar } from 'preview/store/snackbar.slice';
import { setDigitalTwin } from 'preview/store/digitalTwin.slice';

interface CreateDialogsProps {
  openChangeFileNameDialog: boolean;
  onCloseChangeFileNameDialog: () => void;
  fileName: string;
  setFileName: (name: string) => void;
  setFileContent: (content: string) => void;
  setFileType: (type: string) => void;

  openDeleteFileDialog: boolean;
  onCloseDeleteFileDialog: () => void;

  openConfirmDeleteDialog: boolean;
  setOpenConfirmDeleteDialog: (open: boolean) => void;

  openInputDialog: boolean;
  setOpenInputDialog: (open: boolean) => void;

  newDigitalTwinName: string;

  errorMessage: string;
  setErrorMessage: (message: string) => void;
}

const CreateDialogs: React.FC<CreateDialogsProps> = ({
  openChangeFileNameDialog,
  onCloseChangeFileNameDialog,
  fileName,
  setFileName,
  setFileContent,
  setFileType,

  openDeleteFileDialog,
  onCloseDeleteFileDialog,

  openConfirmDeleteDialog,
  setOpenConfirmDeleteDialog,

  openInputDialog,
  setOpenInputDialog,

  newDigitalTwinName,

  errorMessage,
  setErrorMessage,
}) => {
  const [modifiedFileName, setModifiedFileName] = React.useState(fileName);

  const files: FileState[] = useSelector((state: RootState) => state.files);
  const dispatch = useDispatch();

  const defaultFiles = [
    { name: 'description.md', type: 'description' },
    { name: 'README.md', type: 'description' },
    { name: '.gitlab-ci.yml', type: 'config' },
  ];

  useEffect(() => {
    setModifiedFileName(fileName);
  }, [fileName]);

  const handleChangeFileName = () => {
    dispatch(renameFile({ oldName: fileName, newName: modifiedFileName }));

    setFileName(modifiedFileName);

    const extension = modifiedFileName.split('.').pop();
    setFileType(extension || '');

    onCloseChangeFileNameDialog();
  };

  const handleDeleteFile = () => {
    dispatch(deleteFile(fileName));
    setFileName('');
    setFileContent('');
    onCloseDeleteFileDialog();
  };

  const handleCancelConfirmation = () => {
    setOpenConfirmDeleteDialog(false);
  };

  const handleConfirmCancel = () => {
    setFileName('');
    setFileContent('');
    setFileType('');
    dispatch(removeAllCreationFiles());
    setOpenConfirmDeleteDialog(false);
  };

  const handleInputDialogClose = () => {
    setOpenInputDialog(false);
  };

  const handleInputDialogConfirm = async () => {
    const emptyNewFiles = files
      .filter((file) => file.isNew && file.content === '')
      .map((file) => file.name);

    if (emptyNewFiles.length > 0) {
      setErrorMessage(
        `The following files have empty content: ${emptyNewFiles.join(', ')}. Edit them in order to create the new digital twin.`,
      );
      return;
    }

    const gitlabInstance = new GitlabInstance(
      sessionStorage.getItem('username') || '',
      getAuthority(),
      sessionStorage.getItem('access_token') || '',
    );
    await gitlabInstance.init();
    const digitalTwin = new DigitalTwin(newDigitalTwinName, gitlabInstance);
    const result = await digitalTwin.createDT(files);
    if (result.startsWith('Error')) {
      dispatch(showSnackbar({ message: result, severity: 'error' }));
    } else {
      dispatch(
        showSnackbar({
          message: `Digital twin ${newDigitalTwinName} created successfully`,
          severity: 'success',
        }),
      );
      dispatch(setDigitalTwin({ assetName: newDigitalTwinName, digitalTwin }));
      dispatch(removeAllCreationFiles());

      defaultFiles.forEach((file) => {
        const fileExists = files.some(
          (existingFile) => existingFile.name === file.name,
        );
        if (!fileExists) {
          dispatch(addNewFile(file));
        }
      });
    }
    handleInputDialogClose();
    setFileName('');
    setFileContent('');
    setFileType('');
  };

  return (
    <>
      <Dialog open={openChangeFileNameDialog}>
        <DialogTitle>Change the file name</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="New File Name"
            fullWidth
            variant="outlined"
            value={modifiedFileName}
            onChange={(e) => setModifiedFileName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseChangeFileNameDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleChangeFileName} color="secondary">
            Change
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDeleteFileDialog}>
        <DialogContent>
          Are you sure you want to delete the <strong>{fileName}</strong> file
          and its content?
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseDeleteFileDialog} color="primary">
            No
          </Button>
          <Button onClick={handleDeleteFile} color="secondary">
            Yes
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openInputDialog}>
        <DialogContent>
          <Typography>
            Are you sure you want to create the{' '}
            <strong>{newDigitalTwinName}</strong> digital twin?
          </Typography>
          <Typography style={{ color: 'red' }}>{errorMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleInputDialogClose}>Cancel</Button>
          <Button onClick={handleInputDialogConfirm}>Confirm</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openConfirmDeleteDialog}>
        <DialogContent>
          Are you sure you want to delete the inserted files and their content?
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelConfirmation}>Cancel</Button>
          <Button onClick={handleConfirmCancel}>Yes</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CreateDialogs;
