import { addOrUpdateFile } from 'model/store/file.slice';
import { FileState } from 'model/backend/interfaces/sharedInterfaces';
import { Dispatch, SetStateAction } from 'react';
import { useDispatch } from 'react-redux';
import { getFileTypeFromExtension } from 'util/fileUtils';

export const handleAddFileClick = (
  setIsFileNameDialogOpen: Dispatch<SetStateAction<boolean>>,
) => {
  setIsFileNameDialogOpen(true);
};

export const handleCloseFileNameDialog = (
  setIsFileNameDialogOpen: Dispatch<SetStateAction<boolean>>,
  setNewFileName: Dispatch<SetStateAction<string>>,
  setErrorMessage: Dispatch<SetStateAction<string>>,
) => {
  setIsFileNameDialogOpen(false);
  setNewFileName('');
  setErrorMessage('');
};

export interface FileSubmitSetters {
  readonly setErrorMessage: Dispatch<SetStateAction<string>>;
  readonly setIsFileNameDialogOpen: Dispatch<SetStateAction<boolean>>;
  readonly setNewFileName: Dispatch<SetStateAction<string>>;
}

export const handleFileSubmit = (
  files: FileState[],
  newFileName: string,
  dispatch: ReturnType<typeof useDispatch>,
  setters: FileSubmitSetters,
) => {
  const fileExists = files.some(
    (fileStore: { name: string }) => fileStore.name === newFileName,
  );

  if (fileExists) {
    setters.setErrorMessage('A file with this name already exists.');
    return;
  }

  if (newFileName === '') {
    setters.setErrorMessage("File name can't be empty.");
    return;
  }

  setters.setErrorMessage('');
  const type = getFileTypeFromExtension(newFileName);

  dispatch(
    addOrUpdateFile({
      name: newFileName,
      content: '',
      isNew: true,
      isModified: false,
      type,
    }),
  );

  setters.setIsFileNameDialogOpen(false);
  setters.setNewFileName('');
};
