import * as React from 'react';
import { Dispatch, SetStateAction } from 'react';
import { Dialog, DialogActions, DialogContent, Button } from '@mui/material';
import {
  removeAllCreationFiles,
  addOrUpdateFile,
} from 'preview/store/file.slice';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store/store';
import { defaultFiles } from 'preview/util/fileUtils';

interface ConfirmDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  setFileName: Dispatch<SetStateAction<string>>;
  setFileContent: Dispatch<SetStateAction<string>>;
  setFileType: Dispatch<SetStateAction<string>>;
  setNewDigitalTwinName: Dispatch<SetStateAction<string>>;
}

const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({
  open,
  onClose,
  setFileName,
  setFileContent,
  setFileType,
  setNewDigitalTwinName,
}) => {
  const dispatch = useDispatch();

  const files = useSelector((state: RootState) => state.files);

  const handleConfirmCancel = () => {
    setFileName('');
    setFileContent('');
    setFileType('');
    setNewDigitalTwinName('');
    dispatch(removeAllCreationFiles());

    defaultFiles.forEach((file) => {
      const fileExists = files.some(
        (f) => f.name === file.name && f.isNew === true,
      );
      if (!fileExists) {
        dispatch(
          addOrUpdateFile({
            name: file.name,
            content: '',
            isNew: true,
            isModified: false,
          }),
        );
      }
    });

    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent>
        Are you sure you want to delete the inserted files and their content?
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleConfirmCancel}>Yes</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDeleteDialog;
