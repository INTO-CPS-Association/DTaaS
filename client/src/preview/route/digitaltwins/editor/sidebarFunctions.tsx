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
  await digitalTwin.getAssetFiles();
};

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
  library? : boolean,
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
      library? library : undefined,
      libraryFiles || undefined,
      assetPath || undefined,
    );
  }
};

export const renderFileTreeItems = (
  label: string,
  filesToRender: string[],
  asset: DigitalTwin | LibraryAsset,
  setFileName: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
  files: FileState[],
  tab: string,
  dispatch: ReturnType<typeof useDispatch>,
  setIsLibraryFile: Dispatch<SetStateAction<boolean>>,
  setLibraryAssetPath: Dispatch<SetStateAction<string>>,
  library?: boolean,
  libraryFiles?: LibraryConfigFile[],
  assetPath?: string,
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
            asset!,
            setFileName,
            setFileContent,
            setFileType,
            files,
            tab,
            setIsLibraryFile,
            setLibraryAssetPath,
            dispatch,
            library? library : undefined,
            libraryFiles || undefined,
            assetPath || undefined,
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
  setLibraryAssetPath: Dispatch<SetStateAction<string>>,
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
            setLibraryAssetPath,
            dispatch,
            library ? library : undefined,
            fileLibrary? fileLibrary : undefined,
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
  library? : boolean,
  libraryFiles?: LibraryConfigFile[],
  assetPath?: string,
) => {
  if (asset instanceof DigitalTwin || asset === null) {
    if(library === undefined) {
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
        (file) => file.fileName === fileName && file.assetPath === assetPath);
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
        )
        const fileContent = await asset!.DTAssets.getLibraryFileContent(assetPath!, fileName);
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

export const fetchAndSetFileContent = async (
  fileName: string,
  digitalTwin: DigitalTwin | null,
  setFileName: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
  library?: boolean,
  assetPath?: string,
) => {
  try {
    let fileContent;
    if(library) {
      fileContent = await digitalTwin!.DTAssets.getLibraryFileContent(assetPath!, fileName);
    } else {
      fileContent = await digitalTwin!.DTAssets.getFileContent(fileName);
    }
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
  isNew: boolean,
  setIsLibraryFile: Dispatch<SetStateAction<boolean>>,
  setLibraryAssetPath: Dispatch<SetStateAction<string>>,
  dispatch?: ReturnType<typeof useDispatch>,
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
        isNew: isNew,
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
    setIsLibraryFile(true);
    setLibraryAssetPath(libraryAsset!.path);
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
