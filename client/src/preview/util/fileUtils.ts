import {
  addOrUpdateFile,
  FileState,
  renameFile,
} from 'preview/store/file.slice';
import { Dispatch, SetStateAction } from 'react';
import { useDispatch } from 'react-redux';

export const isFileModifiable = (fileName: string) =>
  !['README.md', 'description.md', '.gitlab-ci.yml'].includes(fileName);
export const isFileDeletable = (fileName: string) =>
  !['.gitlab-ci.yml'].includes(fileName);

export const defaultFiles = [
  { name: 'description.md', type: 'description' },
  { name: 'README.md', type: 'description' },
  { name: '.gitlab-ci.yml', type: 'config' },
];

export const validateFiles = (
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

export const addDefaultFiles = (
  defaultFilesNames: { name: string; type: string }[],
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

export const handleChangeFileName = (
  files: FileState[],
  modifiedFileName: string,
  fileName: string,
  setFileName: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
  setErrorChangeMessage: Dispatch<SetStateAction<string>>,
  onClose: () => void,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  const fileExists = files.some(
    (fileStore: { name: string }) => fileStore.name === modifiedFileName,
  );

  if (fileExists) {
    setErrorChangeMessage('A file with this name already exists.');
    return;
  }

  if (modifiedFileName === '') {
    setErrorChangeMessage("File name can't be empty.");
    return;
  }

  setErrorChangeMessage('');
  dispatch(renameFile({ oldName: fileName, newName: modifiedFileName }));
  setFileName(modifiedFileName);

  const extension = modifiedFileName.split('.').pop();
  setFileType(extension || '');

  onClose();
};
