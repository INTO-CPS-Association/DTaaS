import * as React from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
} from '@mui/material';
import { renameFile } from 'preview/store/file.slice';
import { useDispatch } from 'react-redux';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';

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

  const dispatch = useDispatch();

  useEffect(() => {
    setModifiedFileName(fileName);
  }, [fileName]);

  const handleChangeFileName = () => {
    dispatch(renameFile({ oldName: fileName, newName: modifiedFileName }));
    setFileName(modifiedFileName);

    const extension = modifiedFileName.split('.').pop();
    setFileType(extension || '');

    onClose();
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
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cancel
        </Button>
        <Button onClick={handleChangeFileName} color="secondary">
          Change
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChangeFileNameDialog;
