import { Dispatch, SetStateAction } from 'react';
import { Dialog, DialogActions, DialogContent, Button } from '@mui/material';
import { deleteFile } from 'model/store/file.slice';
import { useDispatch } from 'react-redux';

interface DeleteFileDialogProps {
  readonly open: boolean;
  readonly setOpenDeleteFileDialog: Dispatch<SetStateAction<boolean>>;
  readonly fileName: string;
  readonly setFileName: Dispatch<SetStateAction<string>>;
  readonly setFileContent: Dispatch<SetStateAction<string>>;
}

const DeleteFileDialog: React.FC<DeleteFileDialogProps> = ({
  open,
  setOpenDeleteFileDialog,
  fileName,
  setFileName,
  setFileContent,
}) => {
  const dispatch = useDispatch();

  const handleDeleteFile = () => {
    dispatch(deleteFile(fileName));
    setFileName('');
    setFileContent('');
    setOpenDeleteFileDialog(false);
  };

  return (
    <Dialog open={open} onClose={setOpenDeleteFileDialog}>
      <DialogContent>
        Are you sure you want to delete the <strong>{fileName}</strong> file and
        its content?
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpenDeleteFileDialog(false)} color="primary">
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
