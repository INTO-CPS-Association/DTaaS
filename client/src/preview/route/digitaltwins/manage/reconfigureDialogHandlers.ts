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

export const saveChanges = async (
  modifiedFiles: FileState[],
  modifiedLibraryFiles: LibraryConfigFile[],
  digitalTwin: DigitalTwin,
  dispatch: ReturnType<typeof useDispatch>,
  name: string,
) => {
  const fileUpdatePromises = [
    ...modifiedFiles.map((file) =>
      handleFileUpdate(file, digitalTwin, dispatch),
    ),
    ...modifiedLibraryFiles.map((file) =>
      handleFileUpdate(file, digitalTwin, dispatch),
    ),
  ];

  await Promise.all(fileUpdatePromises);

  showSuccessSnackbar(dispatch, name);
  dispatch(removeAllModifiedFiles());
  dispatch(removeAllModifiedLibraryFiles());
};

export const handleFileUpdate = async (
  file: FileState | LibraryConfigFile,
  digitalTwin: DigitalTwin,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  try {
    if ('assetPath' in file) {
      await digitalTwin.DTAssets.updateLibraryFileContent(
        file.fileName,
        file.fileContent,
        file.assetPath,
      );
    } else {
      await digitalTwin.DTAssets.updateFileContent(file.name, file.content);

      if (file.name === 'description.md') {
        dispatch(
          updateDescription({
            assetName: digitalTwin.DTName,
            description: file.content,
          }),
        );
      }
    }
  } catch (error) {
    const fileName = 'assetPath' in file ? file.fileName : file.name;
    dispatch(
      showSnackbar({
        message: `Error updating file ${fileName}: ${error}`,
        severity: 'error',
      }),
    );
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
