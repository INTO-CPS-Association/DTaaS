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
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { handleChangeFileName } from 'preview/util/file';
import { useDispatch, useSelector } from 'react-redux';
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
        <Button
          onClick={() =>
            handleChangeFileName(
              files,
              modifiedFileName,
              fileName,
              setFileName,
              setFileType,
              setErrorChangeMessage,
              onClose,
              dispatch,
            )
          }
          color="secondary"
        >
          Change
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChangeFileNameDialog;
