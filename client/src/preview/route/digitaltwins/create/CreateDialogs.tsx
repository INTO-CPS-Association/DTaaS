import * as React from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
} from '@mui/material';
import { useDispatch } from 'react-redux';
import { deleteFile, renameFile } from 'preview/store/file.slice';

interface CreateDialogsProps {
  openChangeFileNameDialog: boolean;
  onCloseChangeFileNameDialog: () => void;
  fileName: string;
  setFileName: (name: string) => void;
  setFileContent: (content: string) => void;
  setFileType: (type: string) => void;

  openDeleteFileDialog: boolean;
  onCloseDeleteFileDialog: () => void;
}

const CreateDialogs: React.FC<CreateDialogsProps> = ({
  openChangeFileNameDialog,
  onCloseChangeFileNameDialog,
  fileName,
  setFileName,
  setFileContent,
  setFileType,

  openDeleteFileDialog,
  onCloseDeleteFileDialog,
}) => {
  const [modifiedFileName, setModifiedFileName] = React.useState(fileName);
  const dispatch = useDispatch();

  React.useEffect(() => {
    setModifiedFileName(fileName);
  }, [fileName]);

  const handleChangeFileName = () => {
    dispatch(renameFile({ oldName: fileName, newName: modifiedFileName }));

    setFileName(modifiedFileName);

    const extension = modifiedFileName.split('.').pop();
    setFileType(extension || '');

    onCloseChangeFileNameDialog();
  };

  const handleDeleteFile = () => {
    dispatch(deleteFile(fileName));
    setFileName('');
    setFileContent('');
    onCloseDeleteFileDialog();
  };

  return (
    <>
      <Dialog open={openChangeFileNameDialog}>
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
          <Button onClick={onCloseChangeFileNameDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleChangeFileName} color="secondary">
            Change
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDeleteFileDialog}>
        <DialogContent>
          Are you sure you want to delete the <strong>{fileName}</strong> file
          and its content?
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseDeleteFileDialog} color="primary">
            No
          </Button>
          <Button onClick={handleDeleteFile} color="secondary">
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CreateDialogs;
