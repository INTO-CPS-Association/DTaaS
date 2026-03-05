import { Dispatch, SetStateAction, Fragment } from 'react';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { useDispatch } from 'react-redux';
import {
  FileState,
  FileType,
  LibraryConfigFile,
} from 'model/backend/interfaces/sharedInterfaces';
import { getFilteredFileNames } from 'util/fileUtils';
import DigitalTwin from 'model/backend/digitalTwin';
import LibraryAsset from 'model/backend/libraryAsset';
import {
  renderFileTreeItems,
  renderFileSection,
} from 'preview/route/digitaltwins/editor/sidebarRendering';

interface SidebarTreeContentProps {
  name?: string;
  digitalTwinInstance: DigitalTwin | null;
  setFileName: Dispatch<SetStateAction<string>>;
  setFileContent: Dispatch<SetStateAction<string>>;
  setFileType: Dispatch<SetStateAction<string>>;
  setFilePrivacy: Dispatch<SetStateAction<string>>;
  setIsLibraryFile: Dispatch<SetStateAction<boolean>>;
  setLibraryAssetPath: Dispatch<SetStateAction<string>>;
  tab: string;
  files: FileState[];
  assets: LibraryAsset[];
  libraryFiles: LibraryConfigFile[];
}

const SidebarTreeContent = ({
  name,
  digitalTwinInstance,
  setFileName,
  setFileContent,
  setFileType,
  setFilePrivacy,
  setIsLibraryFile,
  setLibraryAssetPath,
  tab,
  files,
  assets,
  libraryFiles,
}: SidebarTreeContentProps) => {
  const dispatch = useDispatch();

  return (
    <SimpleTreeView>
      {name && digitalTwinInstance ? (
        <Fragment key="reconfigure-page">
          {renderFileTreeItems(
            'Description',
            digitalTwinInstance.descriptionFiles,
            digitalTwinInstance,
            setFileName,
            setFileContent,
            setFileType,
            setFilePrivacy,
            files,
            tab,
            dispatch,
            setIsLibraryFile,
            setLibraryAssetPath,
          )}
          {renderFileTreeItems(
            'Configuration',
            digitalTwinInstance.configFiles,
            digitalTwinInstance,
            setFileName,
            setFileContent,
            setFileType,
            setFilePrivacy,
            files,
            tab,
            dispatch,
            setIsLibraryFile,
            setLibraryAssetPath,
          )}
          {renderFileTreeItems(
            'Lifecycle',
            digitalTwinInstance.lifecycleFiles,
            digitalTwinInstance,
            setFileName,
            setFileContent,
            setFileType,
            setFilePrivacy,
            files,
            tab,
            dispatch,
            setIsLibraryFile,
            setLibraryAssetPath,
          )}
          {digitalTwinInstance.assetFiles.map(
            (assetFolder: { assetPath: string; fileNames: string[] }) =>
              renderFileTreeItems(
                `${assetFolder.assetPath} configuration`,
                assetFolder.fileNames,
                digitalTwinInstance,
                setFileName,
                setFileContent,
                setFileType,
                setFilePrivacy,
                files,
                tab,
                dispatch,
                setIsLibraryFile,
                setLibraryAssetPath,
                true,
                libraryFiles,
                assetFolder.assetPath,
              ),
          )}
        </Fragment>
      ) : (
        <Fragment key="create-page">
          {renderFileSection(
            'Description',
            FileType.DESCRIPTION,
            getFilteredFileNames(FileType.DESCRIPTION, files),
            digitalTwinInstance,
            setFileName,
            setFileContent,
            setFileType,
            setFilePrivacy,
            files,
            tab,
            dispatch,
            setIsLibraryFile,
            setLibraryAssetPath,
          )}
          {renderFileSection(
            'Configuration',
            FileType.CONFIGURATION,
            getFilteredFileNames(FileType.CONFIGURATION, files),
            digitalTwinInstance,
            setFileName,
            setFileContent,
            setFileType,
            setFilePrivacy,
            files,
            tab,
            dispatch,
            setIsLibraryFile,
            setLibraryAssetPath,
          )}
          {renderFileSection(
            'Lifecycle',
            FileType.LIFECYCLE,
            getFilteredFileNames(FileType.LIFECYCLE, files),
            digitalTwinInstance,
            setFileName,
            setFileContent,
            setFileType,
            setFilePrivacy,
            files,
            tab,
            dispatch,
            setIsLibraryFile,
            setLibraryAssetPath,
          )}
          {assets.map((asset) =>
            renderFileSection(
              asset.isPrivate
                ? `${asset.name} configuration`
                : `common/${asset.name} configuration`,
              FileType.CONFIGURATION,
              asset.configFiles,
              asset,
              setFileName,
              setFileContent,
              setFileType,
              setFilePrivacy,
              files,
              tab,
              dispatch,
              setIsLibraryFile,
              setLibraryAssetPath,
              true,
              libraryFiles,
            ),
          )}
        </Fragment>
      )}
    </SimpleTreeView>
  );
};

export default SidebarTreeContent;
