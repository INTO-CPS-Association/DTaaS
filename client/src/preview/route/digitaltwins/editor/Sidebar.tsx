import { useEffect, useState, Dispatch, SetStateAction, Fragment } from 'react';
import { Grid, CircularProgress, Button, Box } from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store/store';
import { addOrUpdateLibraryFile } from 'preview/store/libraryConfigFiles.slice';
import { getFilteredFileNames } from 'preview/util/fileUtils';
import { FileState, FileType } from 'model/backend/interfaces/sharedInterfaces';
import { selectDigitalTwinByName } from 'route/digitaltwins/execution';
import DigitalTwin from 'model/backend/digitalTwin';
import { createDigitalTwinFromData } from 'model/backend/util/digitalTwinAdapter';
import { fetchData } from 'preview/route/digitaltwins/editor/sidebarFetchers';
import { handleAddFileClick } from 'preview/route/digitaltwins/editor/sidebarFunctions';
import SidebarDialog from 'preview/route/digitaltwins/editor/SidebarDialog';
import FileActionButtons from 'preview/route/digitaltwins/create/FileActionButtons';
import {
  renderFileTreeItems,
  renderFileSection,
} from 'preview/route/digitaltwins/editor/sidebarRendering';

interface SidebarProps {
  name?: string;
  setFileName: Dispatch<SetStateAction<string>>;
  setFileContent: Dispatch<SetStateAction<string>>;
  setFileType: Dispatch<SetStateAction<string>>;
  setFilePrivacy: Dispatch<SetStateAction<string>>;
  setIsLibraryFile: Dispatch<SetStateAction<boolean>>;
  setLibraryAssetPath: Dispatch<SetStateAction<string>>;
  tab: string;
  fileName: string;
  isLibraryFile: boolean;
  setOpenDeleteFileDialog?: Dispatch<SetStateAction<boolean>>;
  setOpenChangeFileNameDialog?: Dispatch<SetStateAction<boolean>>;
}

const Sidebar = ({
  name,
  setFileName,
  setFileContent,
  setFileType,
  setFilePrivacy,
  setIsLibraryFile,
  setLibraryAssetPath,
  tab,
  fileName,
  isLibraryFile,
  setOpenDeleteFileDialog,
  setOpenChangeFileNameDialog,
}: SidebarProps) => {
  const [isLoading, setIsLoading] = useState(!!name);
  const [newFileName, setNewFileName] = useState('');
  const [isFileNameDialogOpen, setIsFileNameDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [digitalTwinInstance, setDigitalTwinInstance] =
    useState<DigitalTwin | null>(null);

  const digitalTwinData = useSelector((state: RootState) =>
    name ? selectDigitalTwinByName(name)(state) : null,
  );
  const files: FileState[] = useSelector((state: RootState) => state.files);

  const assets = useSelector((state: RootState) => state.cart.assets);
  const libraryFiles = useSelector(
    (state: RootState) => state.libraryConfigFiles,
  );

  const dispatch = useDispatch();

  useEffect(() => {
    const loadFiles = async () => {
      if (name && digitalTwinData) {
        try {
          const instance = await createDigitalTwinFromData(
            digitalTwinData,
            name,
          );
          setDigitalTwinInstance(instance);
          await fetchData(instance);
        } catch {
          setDigitalTwinInstance(null);
        }
      } else {
        setDigitalTwinInstance(null);
      }

      if (tab === 'create') {
        if (assets.length > 0) {
          await Promise.all(
            assets.map(async (asset) => {
              await asset.getConfigFiles();
              asset.configFiles.forEach((configFile) => {
                dispatch(
                  addOrUpdateLibraryFile({
                    assetPath: asset.path,
                    fileName: configFile,
                    fileContent: '',
                    isNew: true,
                    isModified: false,
                    isPrivate: asset.isPrivate,
                  }),
                );
              });
            }),
          );
        }
      }
      setIsLoading(false);
    };

    loadFiles();
  }, [name, digitalTwinData, assets, dispatch, tab]);

  if (isLoading) {
    return (
      <Grid
        container
        direction="column"
        justifyContent="center"
        alignItems="center"
        sx={{
          padding: 2,
          height: '100%',
          maxWidth: '300px',
          position: 'sticky',
          top: 0,
          alignSelf: 'flex-start',
          overflowY: 'auto',
        }}
      >
        <CircularProgress />
      </Grid>
    );
  }

  return (
    <Grid
      container
      direction="column"
      sx={{
        padding: 2,
        height: '100%',
        maxWidth: '300px',
        position: 'sticky',
        top: 0,
        alignSelf: 'flex-start',
        overflowY: 'auto',
      }}
    >
      {tab === 'create' && (
        <Box>
          <Button
            variant="contained"
            onClick={() => handleAddFileClick(setIsFileNameDialogOpen)}
            sx={{ width: '100%', marginBottom: -1 }}
          >
            Add new file
          </Button>

          <Box sx={{ marginBottom: 2 }}>
            <FileActionButtons
              fileName={fileName}
              setOpenDeleteFileDialog={setOpenDeleteFileDialog!}
              setOpenChangeFileNameDialog={setOpenChangeFileNameDialog!}
              isLibraryFile={isLibraryFile}
            />
          </Box>
        </Box>
      )}
      <SidebarDialog
        isOpen={isFileNameDialogOpen}
        newFileName={newFileName}
        setNewFileName={setNewFileName}
        setIsFileNameDialogOpen={setIsFileNameDialogOpen}
        errorMessage={errorMessage}
        setErrorMessage={setErrorMessage}
        files={files}
        dispatch={dispatch}
      />

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
    </Grid>
  );
};

export default Sidebar;
