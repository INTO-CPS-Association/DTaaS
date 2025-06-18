import * as React from 'react';
import { Dispatch, SetStateAction, useState } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  Typography,
  Button,
  CircularProgress,
  Box,
} from '@mui/material';
import { removeAllCreationFiles } from 'preview/store/file.slice';
import {
  FileState,
  LibraryConfigFile,
} from 'model/backend/gitlab/UtilityInterfaces';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store/store';
import DigitalTwin from 'preview/util/digitalTwin';
import { showSnackbar } from 'preview/store/snackbar.slice';
import {
  setDigitalTwin,
  setShouldFetchDigitalTwins,
} from 'preview/store/digitalTwin.slice';
import { addDefaultFiles, validateFiles } from 'preview/util/fileUtils';
import { defaultFiles } from 'model/backend/gitlab/constants';
import { initDigitalTwin } from 'preview/util/init';
import LibraryAsset from 'preview/util/libraryAsset';
import useCart from 'preview/store/CartAccess';

interface CreateDTDialogProps {
  open: boolean;
  setOpenCreateDTDialog: Dispatch<SetStateAction<boolean>>;
  newDigitalTwinName: string;
  setNewDigitalTwinName: Dispatch<SetStateAction<string>>;
  errorMessage: string;
  setErrorMessage: Dispatch<SetStateAction<string>>;
  setFileName: Dispatch<SetStateAction<string>>;
  setFileContent: Dispatch<SetStateAction<string>>;
  setFileType: Dispatch<SetStateAction<string>>;
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
  dispatch(setShouldFetchDigitalTwins(true));
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
  libraryFiles: LibraryConfigFile[],
  cartAssets: LibraryAsset[],
  setErrorMessage: Dispatch<SetStateAction<string>>,
  newDigitalTwinName: string,
  dispatch: ReturnType<typeof useDispatch>,
  setOpenCreateDTDialog: Dispatch<SetStateAction<boolean>>,
  setFileName: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
  setNewDigitalTwinName: Dispatch<SetStateAction<string>>,
  setIsLoading: Dispatch<SetStateAction<boolean>>,
  actions: ReturnType<typeof useCart>['actions'],
) => {
  setIsLoading(true);

  if (validateFiles(files, libraryFiles, setErrorMessage)) {
    setIsLoading(false);
    return;
  }

  const digitalTwin = await initDigitalTwin(newDigitalTwinName);
  const result = await digitalTwin.create(files, cartAssets, libraryFiles);

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
  actions.clear();
  setIsLoading(false);
};

const CreateDTDialog: React.FC<CreateDTDialogProps> = ({
  open,
  setOpenCreateDTDialog,
  newDigitalTwinName,
  setNewDigitalTwinName,
  errorMessage,
  setErrorMessage,
  setFileName,
  setFileContent,
  setFileType,
}) => {
  const files: FileState[] = useSelector((state: RootState) => state.files);
  const libraryFiles = useSelector(
    (state: RootState) => state.libraryConfigFiles,
  );
  const cartAssets = useSelector((state: RootState) => state.cart.assets);
  const dispatch = useDispatch();

  const { actions } = useCart();

  const [isLoading, setIsLoading] = useState(false);

  return (
    <Dialog open={open} onClose={setOpenCreateDTDialog}>
      <DialogContent>
        <Typography>
          Are you sure you want to create the{' '}
          <strong>{newDigitalTwinName}</strong> digital twin?
        </Typography>
        <Typography style={{ color: 'red' }}>{errorMessage}</Typography>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: 2 }}>
            <CircularProgress />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {!isLoading && (
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
        )}
        <Button
          onClick={() =>
            handleConfirm(
              files,
              libraryFiles,
              cartAssets,
              setErrorMessage,
              newDigitalTwinName,
              dispatch,
              setOpenCreateDTDialog,
              setFileName,
              setFileContent,
              setFileType,
              setNewDigitalTwinName,
              setIsLoading,
              actions,
            )
          }
          disabled={isLoading}
        >
          {isLoading ? 'Creating...' : 'Confirm'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateDTDialog;
