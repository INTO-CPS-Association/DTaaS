import * as React from 'react';
import { Dispatch, SetStateAction } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button,
} from '@mui/material';
import { useDispatch } from 'react-redux';
import { FileState } from 'model/backend/gitlab/interfaces';
import {
  handleCloseFileNameDialog,
  handleFileSubmit,
} from './sidebarFunctions';

interface SidebarDialogProps {
  isOpen: boolean;
  newFileName: string;
  setNewFileName: Dispatch<SetStateAction<string>>;
  setIsFileNameDialogOpen: Dispatch<SetStateAction<boolean>>;
  errorMessage: string;
  setErrorMessage: Dispatch<SetStateAction<string>>;
  files: FileState[];
  dispatch: ReturnType<typeof useDispatch>;
}

const SidebarDialog = ({
  isOpen,
  newFileName,
  setNewFileName,
  setIsFileNameDialogOpen,
  errorMessage,
  setErrorMessage,
  files,
  dispatch,
}: SidebarDialogProps) => (
  <Dialog open={isOpen}>
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
      <Button
        onClick={() =>
          handleCloseFileNameDialog(
            setIsFileNameDialogOpen,
            setNewFileName,
            setErrorMessage,
          )
        }
      >
        Cancel
      </Button>
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
);

export default SidebarDialog;
