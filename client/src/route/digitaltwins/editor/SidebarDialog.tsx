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
import { FileState } from 'model/backend/interfaces/sharedInterfaces';
import {
  handleCloseFileNameDialog,
  handleFileSubmit,
} from 'route/digitaltwins/editor/sidebarFunctions';

interface SidebarDialogProps {
  readonly isOpen: boolean;
  readonly newFileName: string;
  readonly setNewFileName: Dispatch<SetStateAction<string>>;
  readonly setIsFileNameDialogOpen: Dispatch<SetStateAction<boolean>>;
  readonly errorMessage: string;
  readonly setErrorMessage: Dispatch<SetStateAction<string>>;
  readonly files: FileState[];
  readonly dispatch: ReturnType<typeof useDispatch>;
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
          handleFileSubmit(files, newFileName, dispatch, {
            setErrorMessage,
            setIsFileNameDialogOpen,
            setNewFileName,
          })
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
