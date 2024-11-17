import { addOrUpdateFile, FileState } from 'preview/store/file.slice';
import DigitalTwin from 'preview/util/digitalTwin';
import { Dispatch, SetStateAction } from 'react';
import { useDispatch } from 'react-redux';
import { TreeItem, TreeItemProps } from '@mui/x-tree-view/TreeItem';
import * as React from 'react';
import LibraryAsset from 'preview/util/libraryAsset';
import {
  addOrUpdateLibraryFile,
  LibraryConfigFile,
} from 'preview/store/libraryConfigFiles.slice';

export const getFileTypeFromExtension = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension === 'md') return 'description';
  if (extension === 'json' || extension === 'yaml' || extension === 'yml')
    return 'config';
  return 'lifecycle';
};

export const fetchData = async (digitalTwin: DigitalTwin) => {
  await digitalTwin.getDescriptionFiles();
  await digitalTwin.getLifecycleFiles();
  await digitalTwin.getConfigFiles();
};

export const handleFileClick = (
  fileName: string,
  asset: DigitalTwin | LibraryAsset | null,
  setFileName: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
  files: FileState[],
  tab: string,
  setIsLibraryFile?: Dispatch<SetStateAction<boolean>>,
  dispatch?: ReturnType<typeof useDispatch>,
  libraryFiles?: LibraryConfigFile[],
  setLibraryAssetPath?: Dispatch<SetStateAction<string>>,
) => {
  if (tab === 'create') {
    handleCreateFileClick(
      fileName,
      asset,
      files,
      setFileName,
      setFileContent,
      setFileType,
      setIsLibraryFile || undefined,
      dispatch || undefined,
      libraryFiles || undefined,
      setLibraryAssetPath || undefined,
    );
  } else if (tab === 'reconfigure') {
    handleReconfigureFileClick(
      fileName,
      asset,
      files,
      setFileName,
      setFileContent,
      setFileType,
    );
  }
};

export const renderFileTreeItems = (
  label: string,
  filesToRender: string[],
  digitalTwin: DigitalTwin,
  setFileName: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
  files: FileState[],
  tab: string,
) => (
  <TreeItem
    itemId={`${label.toLowerCase()}-${label}`}
    label={label as TreeItemProps['label']}
  >
    {filesToRender.map((item) => (
      <TreeItem
        key={item}
        itemId={`${label.toLowerCase()}-${item}`}
        label={item}
        onClick={() =>
          handleFileClick(
            item,
            digitalTwin!,
            setFileName,
            setFileContent,
            setFileType,
            files,
            tab,
          )
        }
      />
    ))}
  </TreeItem>
);

export const getFilteredFileNames = (type: string, files: FileState[]) =>
  files
    .filter(
      (file) => file.isNew && getFileTypeFromExtension(file.name) === type,
    )
    .map((file) => file.name);

export const renderFileSection = (
  label: string,
  type: string,
  filesToRender: string[],
  asset: DigitalTwin | LibraryAsset,
  setFileName: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
  files: FileState[],
  tab: string,
  dispatch: ReturnType<typeof useDispatch>,
  setIsLibraryFile: Dispatch<SetStateAction<boolean>>,
  setLibraryAssetPath?: Dispatch<SetStateAction<string>>,
  library?: boolean,
  fileLibrary?: LibraryConfigFile[],
) => (
  <TreeItem itemId={`${label.toLowerCase()}-${label}`} label={label}>
    {filesToRender.map((item) => (
      <TreeItem
        key={item}
        itemId={`${label.toLowerCase()}-${item}`}
        label={item}
        onClick={() =>
          handleFileClick(
            item,
            asset!,
            setFileName,
            setFileContent,
            setFileType,
            files,
            tab,
            setIsLibraryFile,
            dispatch,
            library ? fileLibrary : undefined,
            setLibraryAssetPath || undefined,
          )
        }
      />
    ))}
  </TreeItem>
);

export const handleCreateFileClick = (
  fileName: string,
  asset: DigitalTwin | LibraryAsset | null,
  files: FileState[],
  setFileName: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
  setIsLibraryFile?: Dispatch<SetStateAction<boolean>>,
  dispatch?: ReturnType<typeof useDispatch>,
  libraryFiles?: LibraryConfigFile[],
  setLibraryAssetPath?: Dispatch<SetStateAction<string>>,
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
      setIsLibraryFile!(false);
      setLibraryAssetPath!('');
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
      setIsLibraryFile!(true);
      setLibraryAssetPath!(libraryFile.assetPath);
    } else {
      fetchAndSetFileLibraryContent(
        libraryFile!.fileName,
        asset,
        setFileName,
        setFileContent,
        setFileType,
        dispatch || undefined,
        setIsLibraryFile || undefined,
        setLibraryAssetPath || undefined,
      );
    }
  }
};

export const handleReconfigureFileClick = (
  fileName: string,
  asset: DigitalTwin | LibraryAsset | null,
  files: FileState[],
  setFileName: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
) => {
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
  } else if (asset instanceof DigitalTwin) {
      fetchAndSetFileContent(
        fileName,
        asset,
        setFileName,
        setFileContent,
        setFileType,
      );
    }
};

export const fetchAndSetFileContent = async (
  fileName: string,
  digitalTwin: DigitalTwin | null,
  setFileName: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
) => {
  try {
    const fileContent = await digitalTwin!.DTAssets.getFileContent(fileName);
    if (fileContent) {
      updateFileState(
        fileName,
        fileContent,
        setFileName,
        setFileContent,
        setFileType,
      );
    }
  } catch {
    setFileContent(`Error fetching ${fileName} content`);
  }
};

export const fetchAndSetFileLibraryContent = async (
  fileName: string,
  libraryAsset: LibraryAsset | null,
  setFileName: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
  dispatch?: ReturnType<typeof useDispatch>,
  setIsLibraryFile?: Dispatch<SetStateAction<boolean>>,
  setLibraryAssetPath?: Dispatch<SetStateAction<string>>,
) => {
  try {
    const fileContent = await libraryAsset!.libraryManager.getFileContent(
      libraryAsset!.isPrivate,
      libraryAsset!.path,
      fileName,
    );

    dispatch!(
      addOrUpdateLibraryFile({
        assetPath: libraryAsset!.path,
        fileName,
        fileContent,
        isModified: false,
      }),
    );
    if (fileContent) {
      updateFileState(
        fileName,
        fileContent,
        setFileName,
        setFileContent,
        setFileType,
      );
    }
    setIsLibraryFile!(true);
    setLibraryAssetPath!(libraryAsset!.path);
  } catch {
    setFileContent(`Error fetching ${fileName} content`);
  }
};

export const updateFileState = (
  fileName: string,
  fileContent: string,
  setFileName: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
) => {
  setFileName(fileName);
  setFileContent(fileContent);
  setFileType(fileName.split('.').pop()!);
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
