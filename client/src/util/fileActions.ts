import { addOrUpdateFile, renameFile } from 'model/store/file.slice';
import { FileState, FileType } from 'model/backend/interfaces/sharedInterfaces';
import { Dispatch, SetStateAction } from 'react';
import { useDispatch } from 'react-redux';
import { getExtension } from 'util/fileUtils';

export const addDefaultFiles = (
  defaultFilesNames: { name: string; type: FileType }[],
  files: FileState[],
  dispatch: ReturnType<typeof useDispatch>,
) => {
  defaultFilesNames.forEach((file) => {
    if (!files.some((existingFile) => existingFile.name === file.name)) {
      dispatch(
        addOrUpdateFile({
          name: file.name,
          content: '',
          isNew: true,
          isModified: false,
          type: file.type,
        }),
      );
    }
  });
};

// Configuration interface for file name change
interface FileNameChangeConfig {
  files: FileState[];
  modifiedFileName: string;
  currentFileName: string;
  setFileName: Dispatch<SetStateAction<string>>;
  setFileType: Dispatch<SetStateAction<string>>;
  setErrorMessage: Dispatch<SetStateAction<string>>;
  setOpenDialog: Dispatch<SetStateAction<boolean>>;
  dispatch: ReturnType<typeof useDispatch>;
}

export const handleChangeFileName = (config: FileNameChangeConfig) => {
  const {
    files,
    modifiedFileName,
    currentFileName,
    setFileName,
    setFileType,
    setErrorMessage,
    setOpenDialog,
    dispatch,
  } = config;

  const fileExists = files.some(
    (fileStore: { name: string }) => fileStore.name === modifiedFileName,
  );

  if (fileExists) {
    setErrorMessage('A file with this name already exists.');
    return;
  }

  if (modifiedFileName === '') {
    setErrorMessage("File name can't be empty.");
    return;
  }

  setErrorMessage('');
  dispatch(renameFile({ oldName: currentFileName, newName: modifiedFileName }));
  setFileName(modifiedFileName);

  const extension = getExtension(modifiedFileName);
  setFileType(extension);

  setOpenDialog(false);
};
