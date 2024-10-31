import * as React from 'react';
import { Dispatch, SetStateAction } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  Typography,
  Button,
} from '@mui/material';
import { FileState, removeAllCreationFiles } from 'preview/store/file.slice';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store/store';
import DigitalTwin from 'preview/util/digitalTwin';
import { showSnackbar } from 'preview/store/snackbar.slice';
import { setDigitalTwin } from 'preview/store/digitalTwin.slice';
import {
  addDefaultFiles,
  defaultFiles,
  validateFiles,
} from 'preview/util/file';
import { initDigitalTwin } from 'preview/util/init';

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
