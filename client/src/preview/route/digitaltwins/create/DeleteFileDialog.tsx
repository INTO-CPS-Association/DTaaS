import * as React from 'react';
import { Dispatch, SetStateAction } from 'react';
import { Dialog, DialogActions, DialogContent, Button } from '@mui/material';
import { deleteFile } from 'preview/store/file.slice';
import { useDispatch } from 'react-redux';

interface DeleteFileDialogProps {
  open: boolean;
  onClose: () => void;
  fileName: string;
  setFileName: Dispatch<SetStateAction<string>>;
  setFileContent: Dispatch<SetStateAction<string>>;
}

const DeleteFileDialog: React.FC<DeleteFileDialogProps> = ({
  open,
  onClose,
  fileName,
  setFileName,
  setFileContent,
}) => {
  const dispatch = useDispatch();

  const handleDeleteFile = () => {
    dispatch(deleteFile(fileName));
    setFileName('');
    setFileContent('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent>
        Are you sure you want to delete the <strong>{fileName}</strong> file and
        its content?
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          No
        </Button>
        <Button onClick={handleDeleteFile} color="secondary">
          Yes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteFileDialog;
