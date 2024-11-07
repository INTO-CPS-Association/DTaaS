import * as React from 'react';
import { useEffect, useState, Dispatch, SetStateAction } from 'react';
import { Grid, CircularProgress, Button } from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store/store';
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

interface SidebarProps {
  name?: string;
  setFileName: Dispatch<SetStateAction<string>>;
  setFileContent: Dispatch<SetStateAction<string>>;
  setFileType: Dispatch<SetStateAction<string>>;
  tab: string;
}

const Sidebar = ({
  name,
  setFileName,
  setFileContent,
  setFileType,
  tab,
}: SidebarProps) => {
  const [isLoading, setIsLoading] = useState(!!name);
  const [newFileName, setNewFileName] = useState('');
  const [isFileNameDialogOpen, setIsFileNameDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const digitalTwin = useSelector((state: RootState) => name ? selectDigitalTwinByName(name)(state) : null);
  const files: FileState[] = useSelector((state: RootState) => state.files);
  const dispatch = useDispatch();

  useEffect(() => {
    if (name && digitalTwin) {
      const loadData = async () => {
        await fetchData(digitalTwin);
        setIsLoading(false);
      };
      loadData();
    }
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
            )}
          </>
        )}
      </SimpleTreeView>
    </Grid>
  );
};

export default Sidebar;