import * as React from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  Typography,
} from '@mui/material';
import { renameFile } from 'preview/store/file.slice';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { RootState } from 'store/store';

interface ChangeFileNameDialogProps {
  open: boolean;
  onClose: () => void;
  fileName: string;
  setFileName: Dispatch<SetStateAction<string>>;
  setFileType: Dispatch<SetStateAction<string>>;
}

const ChangeFileNameDialog: React.FC<ChangeFileNameDialogProps> = ({
  open,
  onClose,
  fileName,
  setFileName,
  setFileType,
}) => {
  const [modifiedFileName, setModifiedFileName] = useState(fileName);
  const [errorChangeMessage, setErrorChangeMessage] = useState('');

  const files = useSelector((state: RootState) => state.files);
  const dispatch = useDispatch();

  useEffect(() => {
    setModifiedFileName(fileName);
  }, [fileName]);

  const handleChangeFileName = () => {
    const fileExists = files.some(
      (fileStore: { name: string }) => fileStore.name === modifiedFileName,
    );

    if (fileExists) {
      setErrorChangeMessage('A file with this name already exists.');
      return;
    }

    if (modifiedFileName === '') {
      setErrorChangeMessage("File name can't be empty.");
      return;
    }

    setErrorChangeMessage('');
    dispatch(renameFile({ oldName: fileName, newName: modifiedFileName }));
    setFileName(modifiedFileName);

    const extension = modifiedFileName.split('.').pop();
    setFileType(extension || '');

    onClose();
  };

  const handleCloseChangeFileNameDialog = () => {
    onClose();
    setErrorChangeMessage('');
    setModifiedFileName(fileName);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Change the file name</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="New File Name"
          fullWidth
          variant="outlined"
          value={modifiedFileName}
          onChange={(e) => setModifiedFileName(e.target.value)}
        />
        <Typography style={{ color: 'red' }}>{errorChangeMessage}</Typography>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => handleCloseChangeFileNameDialog()}
          color="primary"
        >
          Cancel
        </Button>
        <Button onClick={() => handleChangeFileName()} color="secondary">
          Change
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChangeFileNameDialog;
