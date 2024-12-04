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
  setFilePrivacy: Dispatch<SetStateAction<string>>,
  files: FileState[],
  tab: string,
  dispatch: ReturnType<typeof useDispatch>,
  setIsLibraryFile: Dispatch<SetStateAction<boolean>>,
  setLibraryAssetPath: Dispatch<SetStateAction<string>>,
  library?: boolean,
  libraryFiles?: LibraryConfigFile[],
  assetPath?: string,
) => {
  const baseLabel =
    asset instanceof LibraryAsset && !asset.isPrivate
      ? `common/${label.toLowerCase()}`
      : label.toLowerCase();

  return (
    <TreeItem
      itemId={`${baseLabel}-${label}`}
      label={label as TreeItemProps['label']}
    >
      {filesToRender.map((item, index) => {
        const itemLabel =
          asset instanceof LibraryAsset && !asset.isPrivate
            ? `common/${item}`
            : item;

        return (
          <TreeItem
            key={item + index}
            itemId={`${baseLabel}-${item}`}
            label={itemLabel}
            onClick={() =>
              handleFileClick(
                item,
                asset!,
                setFileName,
                setFileContent,
                setFileType,
                setFilePrivacy,
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
        );
      })}
    </TreeItem>
  );
};

export const renderFileSection = (
  label: string,
  type: string,
  filesToRender: string[],
  asset: DigitalTwin | LibraryAsset,
  setFileName: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
  setFilePrivacy: Dispatch<SetStateAction<string>>,
  files: FileState[],
  tab: string,
  dispatch: ReturnType<typeof useDispatch>,
  setIsLibraryFile: Dispatch<SetStateAction<boolean>>,
  setLibraryAssetPath: Dispatch<SetStateAction<string>>,
  library?: boolean,
  fileLibrary?: LibraryConfigFile[],
) => {
  const baseLabel =
    asset instanceof LibraryAsset && !asset.isPrivate
      ? `common/${label.toLowerCase()}`
      : label.toLowerCase();

  return (
    <TreeItem itemId={`${baseLabel}-${label}`} label={label}>
      {filesToRender.map((item, index) => (
        <TreeItem
          key={item + index}
          itemId={`${baseLabel}-${item}`}
          label={item}
          onClick={() =>
            handleFileClick(
              item,
              asset!,
              setFileName,
              setFileContent,
              setFileType,
              setFilePrivacy,
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
};
