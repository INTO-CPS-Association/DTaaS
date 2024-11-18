import * as React from 'react';
import { useEffect, useState, Dispatch, SetStateAction } from 'react';
import { Grid, CircularProgress, Button } from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store/store';
import { addOrUpdateLibraryFile } from 'preview/store/libraryConfigFiles.slice';
import LibraryAsset from 'preview/util/libraryAsset';
import { FileState } from '../../../store/file.slice';
import { selectDigitalTwinByName } from '../../../store/digitalTwin.slice';
import {
  fetchData,
  getFilteredFileNames,
  handleAddFileClick,
  renderFileSection,
  renderFileTreeItems,
} from './sidebarFunctions';
import SidebarDialog from './SidebarDialog';

export const groupedFiles = (assetFiles: LibraryAsset[]) =>
  assetFiles.reduce(
    (acc, file) => {
      const { path } = file;
      if (!acc[path]) {
        acc[path] = [];
      }
      acc[path].push(file);
      return acc;
    },
    {} as Record<string, LibraryAsset[]>,
  );

interface SidebarProps {
  name?: string;
  setFileName: Dispatch<SetStateAction<string>>;
  setFileContent: Dispatch<SetStateAction<string>>;
  setFileType: Dispatch<SetStateAction<string>>;
  setIsLibraryFile: Dispatch<SetStateAction<boolean>>;
  setLibraryAssetPath: Dispatch<SetStateAction<string>>;
  tab: string;
}

const Sidebar = ({
  name,
  setFileName,
  setFileContent,
  setFileType,
  setIsLibraryFile,
  setLibraryAssetPath,
  tab,
}: SidebarProps) => {
  const [isLoading, setIsLoading] = useState(!!name);
  const [newFileName, setNewFileName] = useState('');
  const [isFileNameDialogOpen, setIsFileNameDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const digitalTwin = useSelector((state: RootState) =>
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
      if (name && digitalTwin) {
        await fetchData(digitalTwin);
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
  }, [name, digitalTwin]);

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
        <Button
          variant="contained"
          onClick={() => handleAddFileClick(setIsFileNameDialogOpen)}
          sx={{ marginBottom: 2 }}
        >
          Add new file
        </Button>
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
        {name ? (
          <>
            {renderFileTreeItems(
              'Description',
              digitalTwin!.descriptionFiles,
              digitalTwin!,
              setFileName,
              setFileContent,
              setFileType,
              files,
              tab,
              dispatch,
              setIsLibraryFile,
              setLibraryAssetPath,
            )}
            {renderFileTreeItems(
              'Configuration',
              digitalTwin!.configFiles,
              digitalTwin!,
              setFileName,
              setFileContent,
              setFileType,
              files,
              tab,
              dispatch,
              setIsLibraryFile,
              setLibraryAssetPath,
            )}
            {renderFileTreeItems(
              'Lifecycle',
              digitalTwin!.lifecycleFiles,
              digitalTwin!,
              setFileName,
              setFileContent,
              setFileType,
              files,
              tab,
              dispatch,
              setIsLibraryFile,
              setLibraryAssetPath,
            )}
            {digitalTwin!.assetFiles.map((assetFolder) =>
              renderFileTreeItems(
                `${assetFolder.assetPath} configuration`,
                assetFolder.fileNames,
                digitalTwin!,
                setFileName,
                setFileContent,
                setFileType,
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
          </>
        ) : (
          <>
            {renderFileSection(
              'Description',
              'description',
              getFilteredFileNames('description', files),
              digitalTwin!,
              setFileName,
              setFileContent,
              setFileType,
              files,
              tab,
              dispatch,
              setIsLibraryFile,
              setLibraryAssetPath,
            )}
            {renderFileSection(
              'Configuration',
              'config',
              getFilteredFileNames('config', files),
              digitalTwin!,
              setFileName,
              setFileContent,
              setFileType,
              files,
              tab,
              dispatch,
              setIsLibraryFile,
              setLibraryAssetPath,
            )}
            {renderFileSection(
              'Lifecycle',
              'lifecycle',
              getFilteredFileNames('lifecycle', files),
              digitalTwin!,
              setFileName,
              setFileContent,
              setFileType,
              files,
              tab,
              dispatch,
              setIsLibraryFile,
              setLibraryAssetPath,
            )}
            {assets.map((asset) =>
              renderFileSection(
                `${asset.name} configuration`,
                'config',
                asset.configFiles,
                asset,
                setFileName,
                setFileContent,
                setFileType,
                files,
                tab,
                dispatch,
                setIsLibraryFile,
                setLibraryAssetPath,
                true,
                libraryFiles,
              ),
            )}
          </>
        )}
      </SimpleTreeView>
    </Grid>
  );
};

export default Sidebar;
