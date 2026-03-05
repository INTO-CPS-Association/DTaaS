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
import { removeAllCreationFiles } from 'model/store/file.slice';
import {
  LibraryConfigFile,
  FileState,
} from 'model/backend/interfaces/sharedInterfaces';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store/store';
import DigitalTwin from 'model/backend/digitalTwin';
import { showSnackbar } from 'store/snackbar.slice';
import { addDefaultFiles } from 'util/fileActions';
import { validateFiles } from 'util/fileUtils';
import { defaultFiles } from 'model/backend/gitlab/digitalTwinConfig/constants';
import { initDigitalTwin } from 'model/backend/util/init';
import LibraryAsset from 'model/backend/libraryAsset';
import useCart from 'model/store/CartAccess';
import { extractDataFromDigitalTwin } from 'model/backend/util/digitalTwinAdapter';
import {
  setDigitalTwin,
  setShouldFetchDigitalTwins,
} from 'model/backend/state/digitalTwin.slice';

interface CreateDTDialogProps {
  readonly open: boolean;
  readonly setOpenCreateDTDialog: Dispatch<SetStateAction<boolean>>;
  readonly newDigitalTwinName: string;
  readonly setNewDigitalTwinName: Dispatch<SetStateAction<string>>;
  readonly errorMessage: string;
  readonly setErrorMessage: Dispatch<SetStateAction<string>>;
  readonly setFileName: Dispatch<SetStateAction<string>>;
  readonly setFileContent: Dispatch<SetStateAction<string>>;
  readonly setFileType: Dispatch<SetStateAction<string>>;
}

// Configuration interfaces to reduce parameter count
interface DialogState {
  setOpenCreateDTDialog: Dispatch<SetStateAction<boolean>>;
  setFileName: Dispatch<SetStateAction<string>>;
  setFileContent: Dispatch<SetStateAction<string>>;
  setFileType: Dispatch<SetStateAction<string>>;
  setNewDigitalTwinName: Dispatch<SetStateAction<string>>;
  setErrorMessage: Dispatch<SetStateAction<string>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
}

interface CreateDTConfig {
  files: FileState[];
  libraryFiles: LibraryConfigFile[];
  cartAssets: LibraryAsset[];
  newDigitalTwinName: string;
  dispatch: ReturnType<typeof useDispatch>;
  dialogState: DialogState;
  cartActions: ReturnType<typeof useCart>['actions'];
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
  const digitalTwinData = extractDataFromDigitalTwin(digitalTwin);
  dispatch(
    setDigitalTwin({
      assetName: newDigitalTwinName,
      digitalTwin: digitalTwinData,
    }),
  );
  dispatch(setShouldFetchDigitalTwins(true));
  dispatch(removeAllCreationFiles());

  addDefaultFiles(defaultFiles, files, dispatch);
};

const resetDialogAndForm = (
  dialogState: Omit<
    DialogState,
    'setErrorMessage' | 'setIsLoading' | 'setNewDigitalTwinName'
  >,
) => {
  const { setOpenCreateDTDialog, setFileName, setFileContent, setFileType } =
    dialogState;
  setOpenCreateDTDialog(false);
  setFileName('');
  setFileContent('');
  setFileType('');
};

interface DTCreationConfig {
  newDigitalTwinName: string;
  files: FileState[];
  cartAssets: LibraryAsset[];
  libraryFiles: LibraryConfigFile[];
  dispatch: ReturnType<typeof useDispatch>;
}

const executeCreation = async (config: DTCreationConfig) => {
  const { newDigitalTwinName, files, cartAssets, libraryFiles, dispatch } =
    config;
  const digitalTwin = await initDigitalTwin(newDigitalTwinName);
  const result = await digitalTwin.create(files, cartAssets, libraryFiles);
  if (result.startsWith('Error')) {
    handleError(result, dispatch);
  } else {
    handleSuccess(digitalTwin, dispatch, newDigitalTwinName, files);
  }
};

const handleConfirm = async (config: CreateDTConfig) => {
  const {
    files,
    libraryFiles,
    cartAssets,
    newDigitalTwinName,
    dispatch,
    dialogState,
    cartActions,
  } = config;

  dialogState.setIsLoading(true);

  if (validateFiles(files, libraryFiles, dialogState.setErrorMessage)) {
    dialogState.setIsLoading(false);
    return;
  }

  await executeCreation({
    newDigitalTwinName,
    files,
    cartAssets,
    libraryFiles,
    dispatch,
  });

  resetDialogAndForm(dialogState);
  dialogState.setNewDigitalTwinName('');
  cartActions.clear();
  dialogState.setIsLoading(false);
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
              resetDialogAndForm({
                setOpenCreateDTDialog,
                setFileName,
                setFileContent,
                setFileType,
              })
            }
          >
            Cancel
          </Button>
        )}
        <Button
          onClick={() =>
            handleConfirm({
              files,
              libraryFiles,
              cartAssets,
              newDigitalTwinName,
              dispatch,
              dialogState: {
                setOpenCreateDTDialog,
                setFileName,
                setFileContent,
                setFileType,
                setNewDigitalTwinName,
                setErrorMessage,
                setIsLoading,
              },
              cartActions: actions,
            })
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
