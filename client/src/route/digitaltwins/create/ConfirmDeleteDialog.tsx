import { Dispatch, SetStateAction } from 'react';
import { Dialog, DialogActions, DialogContent, Button } from '@mui/material';
import {
  removeAllCreationFiles,
  addOrUpdateFile,
} from 'model/store/file.slice';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store/store';
import { defaultFiles } from 'model/backend/gitlab/digitalTwinConfig/constants';
import { FileState } from 'model/backend/interfaces/sharedInterfaces';

interface ConfirmDeleteDialogProps {
  readonly open: boolean;
  readonly setOpenConfirmDeleteDialog: Dispatch<SetStateAction<boolean>>;
  readonly setFileName: Dispatch<SetStateAction<string>>;
  readonly setFileContent: Dispatch<SetStateAction<string>>;
  readonly setFileType: Dispatch<SetStateAction<string>>;
  readonly setNewDigitalTwinName: Dispatch<SetStateAction<string>>;
}

// Helper to reset form state
const resetFormState = (
  setFileName: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
  setNewDigitalTwinName: Dispatch<SetStateAction<string>>,
) => {
  setFileName('');
  setFileContent('');
  setFileType('');
  setNewDigitalTwinName('');
};

// Helper to add missing default files
const addMissingDefaultFiles = (
  files: FileState[],
  dispatch: ReturnType<typeof useDispatch>,
) => {
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
};

const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({
  open,
  setOpenConfirmDeleteDialog,
  setFileName,
  setFileContent,
  setFileType,
  setNewDigitalTwinName,
}) => {
  const dispatch = useDispatch();
  const files = useSelector((state: RootState) => state.files);

  const handleConfirmCancel = () => {
    resetFormState(
      setFileName,
      setFileContent,
      setFileType,
      setNewDigitalTwinName,
    );
    dispatch(removeAllCreationFiles());
    addMissingDefaultFiles(files, dispatch);
    setOpenConfirmDeleteDialog(false);
  };

  return (
    <Dialog open={open} onClose={setOpenConfirmDeleteDialog}>
      <DialogContent>
        Are you sure you want to delete the inserted files and their content?
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpenConfirmDeleteDialog(false)}>
          Cancel
        </Button>
        <Button onClick={handleConfirmCancel}>Yes</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDeleteDialog;
