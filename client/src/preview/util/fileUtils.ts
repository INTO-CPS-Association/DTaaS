import { addOrUpdateFile, renameFile } from 'preview/store/file.slice';
import {
  FileState,
  LibraryConfigFile,
} from 'model/backend/gitlab/UtilityInterfaces';
import { Dispatch, SetStateAction } from 'react';
import { useDispatch } from 'react-redux';

export const isFileModifiable = (fileName: string) =>
  !['README.md', 'description.md', '.gitlab-ci.yml'].includes(fileName);
export const isFileDeletable = (fileName: string) =>
  !['.gitlab-ci.yml'].includes(fileName);

export const getExtension = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()! : '';
};

export const validateFiles = (
  files: FileState[],
  libraryFiles: LibraryConfigFile[],
  setErrorMessage: Dispatch<SetStateAction<string>>,
): boolean => {
  const emptyFiles = files
    .filter((file) => file.isNew && file.content === '')
    .map((file) => file.name);

  const emptyLibraryFiles = libraryFiles.filter(
    (file) => file.isNew && file.isModified && file.fileContent === '',
  );

  if (emptyFiles.length > 0 || emptyLibraryFiles.length > 0) {
    setErrorMessage(
      `The following files have empty content: ${
        emptyFiles.length > 0 ? emptyFiles.join(', ') : ''
      }${emptyFiles.length > 0 && emptyLibraryFiles.length > 0 ? ', ' : ''}${
        emptyLibraryFiles.length > 0
          ? emptyLibraryFiles
              .map((file) => `${file.fileName} (${file.assetPath})`)
              .join(', ')
          : ''
      }.\n Edit them in order to create the new digital twin.`,
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
  setOpenChangeFileNameDialog: Dispatch<SetStateAction<boolean>>,
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

  const extension = getExtension(modifiedFileName);
  setFileType(extension);

  setOpenChangeFileNameDialog(false);
};

export const getFileTypeFromExtension = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension === 'md') return 'description';
  if (extension === 'json' || extension === 'yaml' || extension === 'yml')
    return 'config';
  return 'lifecycle';
};

export const getFilteredFileNames = (type: string, files: FileState[]) =>
  files
    .filter(
      (file) => file.isNew && getFileTypeFromExtension(file.name) === type,
    )
    .map((file) => file.name);

export const updateFileState = (
  fileName: string,
  fileContent: string,
  setFileName: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
  setFilePrivacy: Dispatch<SetStateAction<string>>,
  isPrivate?: boolean,
) => {
  setFileName(fileName);
  setFileContent(fileContent);
  setFileType(fileName.split('.').pop()!);
  setFilePrivacy(isPrivate === undefined || isPrivate ? 'private' : 'common');
};
