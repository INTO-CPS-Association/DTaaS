import {
  LibraryConfigFile,
  FileState,
  FileType,
} from 'model/backend/interfaces/sharedInterfaces';
import { Dispatch, SetStateAction } from 'react';

export const isFileModifiable = (fileName: string) =>
  !['README.md', 'description.md', '.gitlab-ci.yml'].includes(fileName);
export const isFileDeletable = (fileName: string) =>
  !['.gitlab-ci.yml'].includes(fileName);

export const getExtension = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()! : '';
};

// Helper function to get empty file names from regular files
const getEmptyFileNames = (files: FileState[]): string[] =>
  files
    .filter((file) => file.isNew && file.content === '')
    .map((file) => file.name);

// Helper function to get empty library files
const getEmptyLibraryFiles = (
  libraryFiles: LibraryConfigFile[],
): LibraryConfigFile[] =>
  libraryFiles.filter(
    (file) => file.isNew && file.isModified && file.fileContent === '',
  );

// Helper function to format empty library file names
const formatLibraryFileNames = (files: LibraryConfigFile[]): string =>
  files.map((file) => `${file.fileName} (${file.assetPath})`).join(', ');

// Helper function to build error message for empty files
const buildEmptyFilesErrorMessage = (
  emptyFiles: string[],
  emptyLibraryFiles: LibraryConfigFile[],
): string => {
  const parts: string[] = [];

  if (emptyFiles.length > 0) {
    parts.push(emptyFiles.join(', '));
  }

  if (emptyLibraryFiles.length > 0) {
    parts.push(formatLibraryFileNames(emptyLibraryFiles));
  }

  return `The following files have empty content: ${parts.join(', ')}.\n Edit them in order to create the new digital twin.`;
};

export const validateFiles = (
  files: FileState[],
  libraryFiles: LibraryConfigFile[],
  setErrorMessage: Dispatch<SetStateAction<string>>,
): boolean => {
  const emptyFiles = getEmptyFileNames(files);
  const emptyLibraryFiles = getEmptyLibraryFiles(libraryFiles);

  const hasEmptyFiles = emptyFiles.length > 0 || emptyLibraryFiles.length > 0;

  if (hasEmptyFiles) {
    const errorMessage = buildEmptyFilesErrorMessage(
      emptyFiles,
      emptyLibraryFiles,
    );
    setErrorMessage(errorMessage);
    return true;
  }

  return false;
};

// File type mapping for efficient lookup
const FILE_TYPE_MAP: Record<string, FileType> = {
  md: FileType.DESCRIPTION,
  json: FileType.CONFIGURATION,
  yaml: FileType.CONFIGURATION,
  yml: FileType.CONFIGURATION,
};

export const getFileTypeFromExtension = (fileName: string): FileType => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return extension && FILE_TYPE_MAP[extension]
    ? FILE_TYPE_MAP[extension]
    : FileType.LIFECYCLE;
};

export const getFilteredFileNames = (type: FileType, files: FileState[]) =>
  files
    .filter(
      (file) => file.isNew && getFileTypeFromExtension(file.name) === type,
    )
    .map((file) => file.name);

// Configuration interface for updating file state
interface FileStateConfig {
  fileName: string;
  fileContent: string;
  setFileName: Dispatch<SetStateAction<string>>;
  setFileContent: Dispatch<SetStateAction<string>>;
  setFileType: Dispatch<SetStateAction<string>>;
  setFilePrivacy: Dispatch<SetStateAction<string>>;
  isPrivate?: boolean;
}

export const updateFileState = (config: FileStateConfig) => {
  const {
    fileName,
    fileContent,
    setFileName,
    setFileContent,
    setFileType,
    setFilePrivacy,
    isPrivate,
  } = config;

  setFileName(fileName);
  setFileContent(fileContent);
  setFileType(fileName.split('.').pop()!);
  setFilePrivacy(isPrivate === undefined || isPrivate ? 'private' : 'common');
};
