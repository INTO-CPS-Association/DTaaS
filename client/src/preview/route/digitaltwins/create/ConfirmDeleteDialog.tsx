import * as React from 'react';
import { Dispatch, SetStateAction } from 'react';
import { Dialog, DialogActions, DialogContent, Button } from '@mui/material';
import { removeAllCreationFiles, addNewFile } from 'preview/store/file.slice';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store/store';

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

    const defaultFiles = [
      { name: 'description.md', type: 'description' },
      { name: 'README.md', type: 'description' },
      { name: '.gitlab-ci.yml', type: 'config' },
    ];

    defaultFiles.forEach((file) => {
      const fileExists = files.some(
        (f) => f.name === file.name && f.isNew === true,
      );
      if (!fileExists) {
        dispatch(addNewFile(file));
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
