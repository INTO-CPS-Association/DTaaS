import * as React from 'react';
import { Dispatch, SetStateAction } from 'react';
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
  setNewDigitalTwinName: Dispatch<SetStateAction<string>>;
  errorMessage: string;
  setErrorMessage: Dispatch<SetStateAction<string>>;
  setFileName: Dispatch<SetStateAction<string>>;
  setFileContent: Dispatch<SetStateAction<string>>;
  setFileType: Dispatch<SetStateAction<string>>;
  setOpenCreateDTDialog: Dispatch<SetStateAction<boolean>>;
}

const defaultFiles = [
  { name: 'description.md', type: 'description' },
  { name: 'README.md', type: 'description' },
  { name: '.gitlab-ci.yml', type: 'config' },
];

const CreateDTDialog: React.FC<CreateDTDialogProps> = ({
  open,
  onClose,
  newDigitalTwinName,
  setNewDigitalTwinName,
  errorMessage,
  setErrorMessage,
  setFileName,
  setFileContent,
  setFileType,
  setOpenCreateDTDialog,
}) => {
  const files: FileState[] = useSelector((state: RootState) => state.files);
  const dispatch = useDispatch();

  const validateFiles = (): boolean => {
    const emptyFiles = files
      .filter((file) => file.isNew && file.content === '')
      .map((file) => file.name);

    if (emptyFiles.length > 0) {
      setErrorMessage(
        `The following files have empty content: ${emptyFiles.join(', ')}. Edit them in order to create the new digital twin.`,
      );
      return true;
    }
    return false;
  };

  const initDigitalTwin = async () => {
    const gitlabInstance = new GitlabInstance(
      sessionStorage.getItem('username') || '',
      getAuthority(),
      sessionStorage.getItem('access_token') || '',
    );
    await gitlabInstance.init();
    return new DigitalTwin(newDigitalTwinName, gitlabInstance);
  };

  const addDefaultFiles = () => {
    defaultFiles.forEach((file) => {
      if (!files.some((existingFile) => existingFile.name === file.name)) {
        dispatch(addNewFile(file));
      }
    });
  };

  const handleError = (message: string) => {
    dispatch(showSnackbar({ message, severity: 'error' }));
  };

  const handleSuccess = (digitalTwin: DigitalTwin) => {
    dispatch(
      showSnackbar({
        message: `Digital twin ${newDigitalTwinName} created successfully`,
        severity: 'success',
      }),
    );
    dispatch(setDigitalTwin({ assetName: newDigitalTwinName, digitalTwin }));
    dispatch(removeAllCreationFiles());
    addDefaultFiles();
  };

  const resetDialogAndForm = () => {
    setOpenCreateDTDialog(false);
    setFileName('');
    setFileContent('');
    setFileType('');
    setNewDigitalTwinName('');
  };

  const handleConfirm = async () => {
    if (validateFiles()) return;

    const digitalTwin = await initDigitalTwin();
    const result = await digitalTwin.createDT(files);

    if (result.startsWith('Error')) {
      handleError(result);
    } else {
      handleSuccess(digitalTwin);
    }

    resetDialogAndForm();
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
        <Button onClick={resetDialogAndForm}>Cancel</Button>
        <Button onClick={handleConfirm}>Confirm</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateDTDialog;
