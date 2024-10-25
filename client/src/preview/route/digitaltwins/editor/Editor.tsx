import * as React from 'react';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FileState, removeAllCreationFiles } from 'preview/store/file.slice';
import {
  Box,
  Grid,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
} from '@mui/material';
import DigitalTwin from 'preview/util/gitlabDigitalTwin';
import { RootState } from 'store/store';
import GitlabInstance from 'preview/util/gitlab';
import { getAuthority } from 'util/envUtil';
import EditorTab from './EditorTab';
import PreviewTab from './PreviewTab';
import Sidebar from './Sidebar';
import CreateDialogs from '../create/CreateDialogs';

interface EditorProps {
  DTName?: string;
  tab: string;
}

function Editor({ DTName, tab }: EditorProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileType, setFileType] = useState('');

  const [openChangeFileNameDialog, setOpenChangeFileNameDialog] = useState(false);
  const [openDeleteFileDialog, setOpenDeleteFileDialog] = useState(false);
  const [openConfirmDeleteDialog, setOpenConfirmDeleteDialog] = useState(false);
  const [openInputDialog, setOpenInputDialog] = useState(false);
  const [newDigitalTwinName, setNewDigitalTwinName] = useState('');
  const files: FileState[] = useSelector((state: RootState) => state.files);

  const dispatch = useDispatch();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const confirmCancel = () => {
    setOpenConfirmDeleteDialog(true);
  };

  const handleCancelConfirmation = () => {
    setOpenConfirmDeleteDialog(false);
    // Ulteriore logica per la cancellazione dei file se necessario
  };

  const handleConfirmCancel = () => {
    setFileName('');
    setFileContent('');
    setFileType('');
    dispatch(removeAllCreationFiles());
    setOpenConfirmDeleteDialog(false);
  };

  const confirmSave = () => {
    setOpenInputDialog(true);
  };

  const handleInputDialogClose = () => {
    setOpenInputDialog(false);
    setNewDigitalTwinName(''); // Reset dell'input
  };

  const handleInputDialogConfirm = async () => {
    const gitlabInstance = new GitlabInstance(
      sessionStorage.getItem('username') || '',
      getAuthority(),
      sessionStorage.getItem('access_token') || '',
    );
    await gitlabInstance.init();
    // Logica per salvare il Digital Twin con il nome newDigitalTwinName
    // console.log('Saving Digital Twin:', newDigitalTwinName);
    const digitalTwin = new DigitalTwin(newDigitalTwinName, gitlabInstance);
    await digitalTwin.createDT(files);
    handleInputDialogClose();
  };

  const isFileModifiable = () =>
    !['README.md', 'description.md', '.gitlab-ci.yml'].includes(fileName);

  const isFileDelatable = () =>
    !['.gitlab-ci.yml'].includes(fileName);

  return (
    <Box sx={{ display: 'flex', height: '100%', width: '100%' }}>
      <Sidebar
        name={DTName}
        setFileName={setFileName}
        setFileContent={setFileContent}
        setFileType={setFileType}
        tab={tab}
      />

      <Grid container direction="column" sx={{ flexGrow: 1, padding: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="editor preview tabs"
          >
            <Tab label="Editor" />
            <Tab label="Preview" />
          </Tabs>
          
          {tab === 'create' && fileName && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {isFileModifiable() && (
                <Button variant="outlined" onClick={() => setOpenChangeFileNameDialog(true)}>
                  Change File Name
                </Button>
              )}
              {isFileDelatable() && (
                <Button variant="outlined" onClick={() => setOpenDeleteFileDialog(true)}>
                  Delete File
                </Button>
              )}
            </Box>
          )}
        </Box>

        <Box
          sx={{
            flexGrow: 1,
            padding: 2,
            border: '1px solid lightgray',
            marginTop: 2,
            width: '800px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {activeTab === 0 && (
            <EditorTab
              fileName={fileName}
              fileContent={fileContent}
              setFileContent={setFileContent}
            />
          )}
          {activeTab === 1 && (
            <PreviewTab fileContent={fileContent} fileType={fileType} />
          )}
        </Box>
        
        {tab === 'create' && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: 2,
              gap: 1,
            }}
          >
            <Button variant="outlined" onClick={confirmCancel}>
              Cancel
            </Button>
            <Button variant="contained" color="primary" onClick={confirmSave}>
              Save
            </Button>
          </Box>
        )}

        {/* Dialog per il nome del Digital Twin */}
        <Dialog open={openInputDialog} onClose={handleInputDialogClose}>
          <DialogTitle>Enter the name of the digital twin</DialogTitle>
          <DialogContent>
            <Typography>This will be the name of the subfolder in your <i>digitaltwins</i> folder.</Typography>
            <TextField
              autoFocus
              margin="dense"
              label="Digital twin name"
              fullWidth
              variant="outlined"
              value={newDigitalTwinName}
              onChange={(e) => setNewDigitalTwinName(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleInputDialogClose}>Cancel</Button>
            <Button onClick={handleInputDialogConfirm}>Confirm</Button>
          </DialogActions>
        </Dialog>

        {/* Dialog di conferma per la cancellazione */}
        <Dialog open={openConfirmDeleteDialog} onClose={handleCancelConfirmation}>
          <DialogContent>Are you sure you want to delete the inserted files and their content?</DialogContent>
          <DialogActions>
            <Button onClick={handleCancelConfirmation}>Cancel</Button>
            <Button onClick={handleConfirmCancel}>Yes</Button>
          </DialogActions>
        </Dialog>

        {/* Dialog per i file di creazione */}
        <CreateDialogs
          openChangeFileNameDialog={openChangeFileNameDialog}
          onCloseChangeFileNameDialog={() => setOpenChangeFileNameDialog(false)}
          fileName={fileName}
          setFileName={setFileName}
          setFileContent={setFileContent}
          setFileType={setFileType}
          openDeleteFileDialog={openDeleteFileDialog}
          onCloseDeleteFileDialog={() => setOpenDeleteFileDialog(false)}
        />
      </Grid>
    </Box>
  );
}

export default Editor;
