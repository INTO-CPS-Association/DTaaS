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
  RenderContext,
} from 'route/digitaltwins/editor/sidebarRendering';
import { FileStateSetters } from 'route/digitaltwins/editor/sidebarFunctions';

interface SidebarTreeContentProps {
  readonly name?: string;
  readonly digitalTwinInstance: DigitalTwin | null;
  readonly setFileName: Dispatch<SetStateAction<string>>;
  readonly setFileContent: Dispatch<SetStateAction<string>>;
  readonly setFileType: Dispatch<SetStateAction<string>>;
  readonly setFilePrivacy: Dispatch<SetStateAction<string>>;
  readonly setIsLibraryFile: Dispatch<SetStateAction<boolean>>;
  readonly setLibraryAssetPath: Dispatch<SetStateAction<string>>;
  readonly tab: string;
  readonly files: FileState[];
  readonly assets: LibraryAsset[];
  readonly libraryFiles: LibraryConfigFile[];
}

interface ReconfigureContentProps {
  readonly digitalTwinInstance: DigitalTwin;
  readonly context: Omit<RenderContext, 'label' | 'filesToRender'>;
  readonly setters: FileStateSetters;
  readonly libraryFiles: LibraryConfigFile[];
}

const ReconfigureContent = ({
  digitalTwinInstance,
  context,
  setters,
  libraryFiles,
}: ReconfigureContentProps) => (
  <Fragment key="reconfigure-page">
    {renderFileTreeItems(
      {
        ...context,
        label: 'Description',
        filesToRender: digitalTwinInstance.descriptionFiles,
      },
      setters,
    )}
    {renderFileTreeItems(
      {
        ...context,
        label: 'Configuration',
        filesToRender: digitalTwinInstance.configFiles,
      },
      setters,
    )}
    {renderFileTreeItems(
      {
        ...context,
        label: 'Lifecycle',
        filesToRender: digitalTwinInstance.lifecycleFiles,
      },
      setters,
    )}
    {digitalTwinInstance.assetFiles.map(
      (assetFolder: { assetPath: string; fileNames: string[] }) =>
        renderFileTreeItems(
          {
            ...context,
            label: `${assetFolder.assetPath} configuration`,
            filesToRender: assetFolder.fileNames,
          },
          setters,
          { library: true, libraryFiles, assetPath: assetFolder.assetPath },
        ),
    )}
  </Fragment>
);

interface CreateContentProps {
  readonly context: Omit<RenderContext, 'label' | 'filesToRender'>;
  readonly setters: FileStateSetters;
  readonly assets: LibraryAsset[];
  readonly libraryFiles: LibraryConfigFile[];
  readonly files: FileState[];
}

const CreateContent = ({
  context,
  setters,
  assets,
  libraryFiles,
  files,
}: CreateContentProps) => (
  <Fragment key="create-page">
    {renderFileSection(
      {
        ...context,
        label: 'Description',
        filesToRender: getFilteredFileNames(FileType.DESCRIPTION, files),
      },
      setters,
    )}
    {renderFileSection(
      {
        ...context,
        label: 'Configuration',
        filesToRender: getFilteredFileNames(FileType.CONFIGURATION, files),
      },
      setters,
    )}
    {renderFileSection(
      {
        ...context,
        label: 'Lifecycle',
        filesToRender: getFilteredFileNames(FileType.LIFECYCLE, files),
      },
      setters,
    )}
    {assets.map((asset) =>
      renderFileSection(
        {
          ...context,
          label: asset.isPrivate
            ? `${asset.name} configuration`
            : `common/${asset.name} configuration`,
          filesToRender: asset.configFiles,
          asset,
        },
        setters,
        { library: true, libraryFiles },
      ),
    )}
  </Fragment>
);

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

  const setters: FileStateSetters = {
    setFileName,
    setFileContent,
    setFileType,
    setFilePrivacy,
    setIsLibraryFile,
    setLibraryAssetPath,
  };

  const baseContext: Omit<RenderContext, 'label' | 'filesToRender'> = {
    asset: digitalTwinInstance,
    tab,
    files,
    dispatch,
  };

  return (
    <SimpleTreeView>
      {name && digitalTwinInstance ? (
        <ReconfigureContent
          digitalTwinInstance={digitalTwinInstance}
          context={baseContext}
          setters={setters}
          libraryFiles={libraryFiles}
        />
      ) : (
        <CreateContent
          context={baseContext}
          setters={setters}
          assets={assets}
          libraryFiles={libraryFiles}
          files={files}
        />
      )}
    </SimpleTreeView>
  );
};

export default SidebarTreeContent;
