import * as React from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  Typography,
  Button,
} from '@mui/material';
import {
  addNewFile,
  FileState,
  removeAllCreationFiles,
} from 'preview/store/file.slice';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store/store';
import GitlabInstance from 'preview/util/gitlab';
import { getAuthority } from 'util/envUtil';
import DigitalTwin from 'preview/util/gitlabDigitalTwin';
import { showSnackbar } from 'preview/store/snackbar.slice';
import { setDigitalTwin } from 'preview/store/digitalTwin.slice';

interface CreateDTDialogProps {
  open: boolean;
  onClose: () => void;
  newDigitalTwinName: string;
  setNewDigitalTwinName: (name: string) => void;
  errorMessage: string;
  setErrorMessage: (message: string) => void;
  setFileName: (name: string) => void;
  setFileContent: (content: string) => void;
  setFileType: (type: string) => void;
  setOpenInputDialog: (open: boolean) => void;
}

const defaultFiles = [
  { name: 'description.md', type: 'description' },
  { name: 'README.md', type: 'description' },
  { name: '.gitlab-ci.yml', type: 'config' },
];

const InputDialog: React.FC<CreateDTDialogProps> = ({
  open,
  onClose,
  newDigitalTwinName,
  setNewDigitalTwinName,
  errorMessage,
  setErrorMessage,
  setFileName,
  setFileContent,
  setFileType,
  setOpenInputDialog,
}) => {
  const files: FileState[] = useSelector((state: RootState) => state.files);
  const dispatch = useDispatch();

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
    setNewDigitalTwinName('');
  };

  return (
    <Dialog open={open} onClose={onClose}>
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
  );
};

export default InputDialog;
