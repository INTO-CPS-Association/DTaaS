import { addOrUpdateFile, FileState } from 'preview/store/file.slice';
import DigitalTwin from 'preview/util/digitalTwin';
import { Dispatch, SetStateAction } from 'react';
import { useDispatch } from 'react-redux';
import LibraryAsset from 'preview/util/libraryAsset';
import {
  addOrUpdateLibraryFile,
  LibraryConfigFile,
} from 'preview/store/libraryConfigFiles.slice';
import {
  getFileTypeFromExtension,
  updateFileState,
} from 'preview/util/fileUtils';
import {
  fetchAndSetFileContent,
  fetchAndSetFileLibraryContent,
} from './sidebarFetchers';

export const handleFileClick = (
  fileName: string,
  asset: DigitalTwin | LibraryAsset | null,
  setFileName: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
  files: FileState[],
  tab: string,
  setIsLibraryFile: Dispatch<SetStateAction<boolean>>,
  setLibraryAssetPath: Dispatch<SetStateAction<string>>,
  dispatch?: ReturnType<typeof useDispatch>,
  library?: boolean,
  libraryFiles?: LibraryConfigFile[],
  assetPath?: string,
) => {
  if (tab === 'create') {
    handleCreateFileClick(
      fileName,
      asset,
      files,
      setFileName,
      setFileContent,
      setFileType,
      setIsLibraryFile,
      setLibraryAssetPath,
      dispatch || undefined,
      libraryFiles || undefined,
    );
  } else if (tab === 'reconfigure') {
    handleReconfigureFileClick(
      fileName,
      asset,
      files,
      setFileName,
      setFileContent,
      setFileType,
      setIsLibraryFile,
      setLibraryAssetPath,
      dispatch || undefined,
      library || undefined,
      libraryFiles || undefined,
      assetPath || undefined,
    );
  }
};

export const handleCreateFileClick = (
  fileName: string,
  asset: DigitalTwin | LibraryAsset | null,
  files: FileState[],
  setFileName: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
  setIsLibraryFile: Dispatch<SetStateAction<boolean>>,
  setLibraryAssetPath: Dispatch<SetStateAction<string>>,
  dispatch?: ReturnType<typeof useDispatch>,
  libraryFiles?: LibraryConfigFile[],
) => {
  if (asset instanceof DigitalTwin || asset === null) {
    const newFile = files.find((file) => file.name === fileName && file.isNew);
    if (newFile) {
      updateFileState(
        newFile.name,
        newFile.content,
        setFileName,
        setFileContent,
        setFileType,
      );
      setIsLibraryFile(false);
      setLibraryAssetPath('');
    }
  } else {
    const libraryFile = libraryFiles!.find(
      (file) => file.fileName === fileName && file.assetPath === asset!.path,
    );
    if (libraryFile?.isModified) {
      updateFileState(
        libraryFile.fileName,
        libraryFile.fileContent,
        setFileName,
        setFileContent,
        setFileType,
      );
      setIsLibraryFile(true);
      setLibraryAssetPath(libraryFile.assetPath);
    } else {
      fetchAndSetFileLibraryContent(
        libraryFile!.fileName,
        asset,
        setFileName,
        setFileContent,
        setFileType,
        true,
        setIsLibraryFile,
        setLibraryAssetPath,
        dispatch || undefined,
      );
    }
  }
};

export const handleReconfigureFileClick = async (
  fileName: string,
  asset: DigitalTwin | LibraryAsset | null,
  files: FileState[],
  setFileName: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
  setIsLibraryFile: Dispatch<SetStateAction<boolean>>,
  setLibraryAssetPath: Dispatch<SetStateAction<string>>,
  dispatch?: ReturnType<typeof useDispatch>,
  library?: boolean,
  libraryFiles?: LibraryConfigFile[],
  assetPath?: string,
) => {
  if (asset instanceof DigitalTwin || asset === null) {
    if (library === undefined) {
      const modifiedFile = files.find(
        (file) => file.name === fileName && file.isModified && !file.isNew,
      );
      if (modifiedFile) {
        updateFileState(
          modifiedFile.name,
          modifiedFile.content,
          setFileName,
          setFileContent,
          setFileType,
        );
      } else {
        fetchAndSetFileContent(
          fileName,
          asset,
          setFileName,
          setFileContent,
          setFileType,
        );
      }
      setIsLibraryFile(false);
      setLibraryAssetPath('');
    } else {
      const modifiedLibraryFile = libraryFiles!.find(
        (file) => file.fileName === fileName && file.assetPath === assetPath,
      );
      if (modifiedLibraryFile?.isModified) {
        updateFileState(
          modifiedLibraryFile.fileName,
          modifiedLibraryFile.fileContent,
          setFileName,
          setFileContent,
          setFileType,
        );
      } else {
        fetchAndSetFileContent(
          fileName,
          asset,
          setFileName,
          setFileContent,
          setFileType,
          library,
          assetPath,
        );
        const fileContent = await asset!.DTAssets.getLibraryFileContent(
          assetPath!,
          fileName,
        );
        dispatch!(
          addOrUpdateLibraryFile({
            assetPath: assetPath!,
            fileName,
            fileContent,
            isNew: false,
            isModified: false,
          }),
        );
      }
      setIsLibraryFile(true);
      setLibraryAssetPath!(assetPath!);
    }
  }
};

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

export const handleFileSubmit = (
  files: FileState[],
  newFileName: string,
  setErrorMessage: Dispatch<SetStateAction<string>>,
  dispatch: ReturnType<typeof useDispatch>,
  setIsFileNameDialogOpen: Dispatch<SetStateAction<boolean>>,
  setNewFileName: Dispatch<SetStateAction<string>>,
) => {
  const fileExists = files.some(
    (fileStore: { name: string }) => fileStore.name === newFileName,
  );

  if (fileExists) {
    setErrorMessage('A file with this name already exists.');
    return;
  }

  if (newFileName === '') {
    setErrorMessage("File name can't be empty.");
    return;
  }

  setErrorMessage('');
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

  setIsFileNameDialogOpen(false);
  setNewFileName('');
};
