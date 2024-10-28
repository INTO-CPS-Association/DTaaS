import * as React from 'react';
import { useEffect, useState, Dispatch, SetStateAction } from 'react';
import {
  Grid,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
} from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store/store';
import { FileState } from '../../../store/file.slice';
import { selectDigitalTwinByName } from '../../../store/digitalTwin.slice';
import DigitalTwin from '../../../util/gitlabDigitalTwin';
import {
  handleAddFileClick,
  handleCreateFileClick,
  handleFileSubmit,
  handleReconfigureFileClick,
} from './sidebarFunctions';

interface SidebarProps {
  name?: string;
  setFileName: Dispatch<SetStateAction<string>>;
  setFileContent: Dispatch<SetStateAction<string>>;
  setFileType: Dispatch<SetStateAction<string>>;
  tab: string;
}

const fetchData = async (digitalTwin: DigitalTwin) => {
  await digitalTwin.getDescriptionFiles();
  await digitalTwin.getLifecycleFiles();
  await digitalTwin.getConfigFiles();
};

const handleFileClick = (
  fileName: string,
  digitalTwin: DigitalTwin | null,
  setFileName: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
  files: FileState[],
  tab: string,
) => {
  if (tab === 'create') {
    handleCreateFileClick(
      fileName,
      files,
      setFileName,
      setFileContent,
      setFileType,
    );
  } else if (tab === 'reconfigure') {
    handleReconfigureFileClick(
      fileName,
      digitalTwin,
      files,
      setFileName,
      setFileContent,
      setFileType,
    );
  }
};

const renderFileTreeItems = (
  label: string,
  filesToRender: string[],
  digitalTwin: DigitalTwin,
  setFileName: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
  files: FileState[],
  tab: string,
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

const getFilteredFileNames = (type: string, files: FileState[]) =>
  files
    .filter((file) => file.type === type && file.isNew)
    .map((file) => file.name);

const renderFileSection = (
  label: string,
  type: string,
  filesToRender: string[],
  digitalTwin: DigitalTwin,
  setFileName: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
  files: FileState[],
  tab: string,
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

  const digitalTwin = name ? useSelector(selectDigitalTwinByName(name)) : null;
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

      <Dialog open={isFileNameDialogOpen}>
        <DialogTitle>Enter the file name</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="File Name"
            fullWidth
            variant="outlined"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
          />
          {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsFileNameDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() =>
              handleFileSubmit(
                files,
                newFileName,
                setErrorMessage,
                dispatch,
                setIsFileNameDialogOpen,
                setNewFileName,
              )
            }
            variant="contained"
            color="primary"
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

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
