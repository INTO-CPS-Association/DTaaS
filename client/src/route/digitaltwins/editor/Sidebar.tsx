import { useState, Dispatch, SetStateAction } from 'react';
import { Grid, CircularProgress, Button, Box } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store/store';
import { FileState } from 'model/backend/interfaces/sharedInterfaces';
import { handleAddFileClick } from 'route/digitaltwins/editor/sidebarFunctions';
import SidebarDialog from 'route/digitaltwins/editor/SidebarDialog';
import FileActionButtons from 'route/digitaltwins/create/FileActionButtons';
import useSidebarLoader from 'route/digitaltwins/editor/useSidebarLoader';
import SidebarTreeContent from 'route/digitaltwins/editor/SidebarTreeContent';

interface SidebarProps {
  readonly name?: string;
  readonly setFileName: Dispatch<SetStateAction<string>>;
  readonly setFileContent: Dispatch<SetStateAction<string>>;
  readonly setFileType: Dispatch<SetStateAction<string>>;
  readonly setFilePrivacy: Dispatch<SetStateAction<string>>;
  readonly setIsLibraryFile: Dispatch<SetStateAction<boolean>>;
  readonly setLibraryAssetPath: Dispatch<SetStateAction<string>>;
  readonly tab: string;
  readonly fileName: string;
  readonly isLibraryFile: boolean;
  readonly setOpenDeleteFileDialog?: Dispatch<SetStateAction<boolean>>;
  readonly setOpenChangeFileNameDialog?: Dispatch<SetStateAction<boolean>>;
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
  const [newFileName, setNewFileName] = useState('');
  const [isFileNameDialogOpen, setIsFileNameDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { isLoading, digitalTwinInstance } = useSidebarLoader({ name, tab });

  const files: FileState[] = useSelector((state: RootState) => state.files);
  const assets = useSelector((state: RootState) => state.cart.assets);
  const libraryFiles = useSelector(
    (state: RootState) => state.libraryConfigFiles,
  );

  const dispatch = useDispatch();

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

          {setOpenDeleteFileDialog && setOpenChangeFileNameDialog && (
            <Box sx={{ marginBottom: 2 }}>
              <FileActionButtons
                fileName={fileName}
                setOpenDeleteFileDialog={setOpenDeleteFileDialog}
                setOpenChangeFileNameDialog={setOpenChangeFileNameDialog}
                isLibraryFile={isLibraryFile}
              />
            </Box>
          )}
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

      <SidebarTreeContent
        name={name}
        digitalTwinInstance={digitalTwinInstance}
        setFileName={setFileName}
        setFileContent={setFileContent}
        setFileType={setFileType}
        setFilePrivacy={setFilePrivacy}
        setIsLibraryFile={setIsLibraryFile}
        setLibraryAssetPath={setLibraryAssetPath}
        tab={tab}
        files={files}
        assets={assets}
        libraryFiles={libraryFiles}
      />
    </Grid>
  );
};

export default Sidebar;
