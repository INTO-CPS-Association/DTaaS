import { AlertColor } from '@mui/material';
import { useDispatch } from 'react-redux';
import { removeAllModifiedLibraryFiles } from 'model/store/libraryConfigFiles.slice';
import {
  LibraryConfigFile,
  FileState,
} from 'model/backend/interfaces/sharedInterfaces';
import { removeAllModifiedFiles } from 'model/store/file.slice';
import { updateDescription } from 'model/backend/state/digitalTwin.slice';
import { showSnackbar } from 'store/snackbar.slice';
import DigitalTwin, { formatName } from 'model/backend/digitalTwin';

export interface SaveContext {
  readonly modifiedFiles: FileState[];
  readonly modifiedLibraryFiles: LibraryConfigFile[];
  readonly name: string;
}

export const saveChanges = async (
  context: SaveContext,
  digitalTwin: DigitalTwin,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  const fileUpdatePromises = [
    ...context.modifiedFiles.map((file) =>
      handleFileUpdate(file, digitalTwin, dispatch),
    ),
    ...context.modifiedLibraryFiles.map((file) =>
      handleFileUpdate(file, digitalTwin, dispatch),
    ),
  ];

  await Promise.all(fileUpdatePromises);

  showSuccessSnackbar(dispatch, context.name);
  dispatch(removeAllModifiedFiles());
  dispatch(removeAllModifiedLibraryFiles());
};

const updateLibraryFile = async (
  file: LibraryConfigFile,
  digitalTwin: DigitalTwin,
) => {
  await digitalTwin.DTAssets.updateLibraryFileContent(
    file.fileName,
    file.fileContent,
    file.assetPath,
  );
};

const updateDigitalTwinFile = async (
  file: FileState,
  digitalTwin: DigitalTwin,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  await digitalTwin.DTAssets.updateFileContent(file.name, file.content);

  if (file.name === 'description.md') {
    dispatch(
      updateDescription({
        assetName: digitalTwin.DTName,
        description: file.content,
      }),
    );
  }
};

const getFileName = (file: FileState | LibraryConfigFile): string =>
  'assetPath' in file ? file.fileName : file.name;

const handleUpdateError = (
  error: unknown,
  fileName: string,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  dispatch(
    showSnackbar({
      message: `Error updating file ${fileName}: ${error}`,
      severity: 'error',
    }),
  );
};

export const handleFileUpdate = async (
  file: FileState | LibraryConfigFile,
  digitalTwin: DigitalTwin,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  try {
    if ('assetPath' in file) {
      await updateLibraryFile(file, digitalTwin);
    } else {
      await updateDigitalTwinFile(file, digitalTwin, dispatch);
    }
  } catch (error) {
    handleUpdateError(error, getFileName(file), dispatch);
  }
};

export const showSuccessSnackbar = (
  dispatch: ReturnType<typeof useDispatch>,
  name: string,
) => {
  dispatch(
    showSnackbar({
      message: `${formatName(name)} reconfigured successfully`,
      severity: 'success' as AlertColor,
    }),
  );
};
