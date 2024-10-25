import * as React from 'react';
import { useEffect, useState, Dispatch, SetStateAction } from 'react';
import { Grid, CircularProgress, Button, Dialog, DialogTitle, DialogContent, TextField, DialogActions } from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store/store';
import { addNewFile, FileState } from '../../../store/file.slice';
import { selectDigitalTwinByName } from '../../../store/digitalTwin.slice';
import DigitalTwin from '../../../util/gitlabDigitalTwin';

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
  tab: string
) => {
  if (tab === 'create') {
    const newFile = files.find((file) => file.name === fileName && file.isNew);
    if (newFile) {
      updateFileState(
        newFile.name,
        newFile.content,
        setFileName,
        setFileContent,
        setFileType
      );
    }
  } else if (tab === 'reconfigure') {
    const modifiedFile = files.find((file) => file.name === fileName && file.isModified && !file.isNew);
    if (modifiedFile) {
      updateFileState(
        modifiedFile.name,
        modifiedFile.content,
        setFileName,
        setFileContent,
        setFileType
      );
    } else {
      digitalTwin!.getFileContent(fileName).then((fileContent) => {
        if (fileContent) {
          updateFileState(
            fileName,
            fileContent,
            setFileName,
            setFileContent,
            setFileType
          );
        }
      }).catch(() => {
        setFileContent(`Error fetching ${fileName} content`);
      });
    }
  }
};

const updateFileState = (
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

  const handleAddFileClick = () => {
    setIsFileNameDialogOpen(true);
  };

  const handleFileSubmit = () => {
    const fileExtension = newFileName.split('.').pop()?.toLowerCase();
  
    const fileExists = files.some((fileStore: { name: string; }) => fileStore.name === newFileName);
  
    if (fileExists) {
      setErrorMessage("A file with this name already exists.");
      return;
    }
    
    setErrorMessage('');
    let type;
    
    if (fileExtension === 'md') {
      type = 'description';
    } else if (fileExtension === 'json' || fileExtension === 'yaml' || fileExtension === 'yml') {
      type = 'config';
    } else {
      type = 'lifecycle';
    }
  
    dispatch(addNewFile({ name: newFileName, type }));
  
    setIsFileNameDialogOpen(false);
    setNewFileName('');
  };

  const renderFileTreeItems = (label: string, filesToRender: string[]) => (
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
        <Button variant="contained" onClick={handleAddFileClick} sx={{ marginBottom: 2 }}>
          Add new file
        </Button>
      )}

      <Dialog open={isFileNameDialogOpen} onClose={() => setIsFileNameDialogOpen(false)}>
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
          <Button onClick={handleFileSubmit} variant="contained" color="primary">
            Add
          </Button>
        </DialogActions>
      </Dialog>
      
      <SimpleTreeView>
        {name ? (
          <>
            {renderFileTreeItems('Description', digitalTwin!.descriptionFiles)}
            {renderFileTreeItems('Configuration', digitalTwin!.configFiles)}
            {renderFileTreeItems('Lifecycle', digitalTwin!.lifecycleFiles)}
          </>
        ) : (
          <>
            {renderFileTreeItems('Description', files.filter(f => f.type === 'description' && f.isNew).map(f => f.name))}
            {renderFileTreeItems('Configuration', files.filter(f => f.type === 'config' && f.isNew).map(f => f.name))}
            {renderFileTreeItems('Lifecycle', files.filter(f => f.type === 'lifecycle' && f.isNew).map(f => f.name))}
          </>
        )}
      </SimpleTreeView>
    </Grid>
  );
};

export default Sidebar;
