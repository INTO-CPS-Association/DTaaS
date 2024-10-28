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

const validateFiles = (
  files: FileState[],
  setErrorMessage: Dispatch<SetStateAction<string>>,
): boolean => {
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

const initDigitalTwin = async (newDigitalTwinName: string) => {
  const gitlabInstance = new GitlabInstance(
    sessionStorage.getItem('username') || '',
    getAuthority(),
    sessionStorage.getItem('access_token') || '',
  );
  await gitlabInstance.init();
  return new DigitalTwin(newDigitalTwinName, gitlabInstance);
};

const addDefaultFiles = (
  defaultFilesNames: { name: string; type: string }[],
  files: FileState[],
  dispatch: ReturnType<typeof useDispatch>,
) => {
  defaultFilesNames.forEach((file) => {
    if (!files.some((existingFile) => existingFile.name === file.name)) {
      dispatch(addNewFile(file));
    }
  });
};

const handleError = (
  message: string,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  dispatch(showSnackbar({ message, severity: 'error' }));
};

const handleSuccess = (
  digitalTwin: DigitalTwin,
  dispatch: ReturnType<typeof useDispatch>,
  newDigitalTwinName: string,
  files: FileState[],
) => {
  dispatch(
    showSnackbar({
      message: `Digital twin ${newDigitalTwinName} created successfully`,
      severity: 'success',
    }),
  );
  dispatch(setDigitalTwin({ assetName: newDigitalTwinName, digitalTwin }));
  dispatch(removeAllCreationFiles());

  addDefaultFiles(defaultFiles, files, dispatch);
};

const resetDialogAndForm = (
  setOpenCreateDTDialog: Dispatch<SetStateAction<boolean>>,
  setFileName: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
) => {
  setOpenCreateDTDialog(false);
  setFileName('');
  setFileContent('');
  setFileType('');
};

const handleConfirm = async (
  files: FileState[],
  setErrorMessage: Dispatch<SetStateAction<string>>,
  newDigitalTwinName: string,
  dispatch: ReturnType<typeof useDispatch>,
  setOpenCreateDTDialog: Dispatch<SetStateAction<boolean>>,
  setFileName: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
  setNewDigitalTwinName: Dispatch<SetStateAction<string>>,
) => {
  if (validateFiles(files, setErrorMessage)) return;

  const digitalTwin = await initDigitalTwin(newDigitalTwinName);
  const result = await digitalTwin.createDT(files);

  if (result.startsWith('Error')) {
    handleError(result, dispatch);
  } else {
    handleSuccess(digitalTwin, dispatch, newDigitalTwinName, files);
  }

  resetDialogAndForm(
    setOpenCreateDTDialog,
    setFileName,
    setFileContent,
    setFileType,
  );
  setNewDigitalTwinName('');
};

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
        <Button
          onClick={() =>
            resetDialogAndForm(
              setOpenCreateDTDialog,
              setFileName,
              setFileContent,
              setFileType,
            )
          }
        >
          Cancel
        </Button>
        <Button
          onClick={() =>
            handleConfirm(
              files,
              setErrorMessage,
              newDigitalTwinName,
              dispatch,
              setOpenCreateDTDialog,
              setFileName,
              setFileContent,
              setFileType,
              setNewDigitalTwinName,
            )
          }
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateDTDialog;
