import * as React from 'react';
import { TreeItem, TreeItemProps } from '@mui/x-tree-view/TreeItem';
import { FileState } from 'preview/store/file.slice';
import { LibraryConfigFile } from 'preview/store/libraryConfigFiles.slice';
import DigitalTwin from 'preview/util/digitalTwin';
import LibraryAsset from 'preview/util/libraryAsset';
import { Dispatch, SetStateAction } from 'react';
import { useDispatch } from 'react-redux';
import { handleFileClick } from './sidebarFunctions';

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
            library || undefined,
            libraryFiles || undefined,
            assetPath || undefined,
          )
        }
      />
    ))}
  </TreeItem>
);

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
            library || undefined,
            fileLibrary || undefined,
          )
        }
      />
    ))}
  </TreeItem>
);
