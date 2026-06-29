import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  Typography,
} from '@mui/material';
import { Dispatch, SetStateAction, useState } from 'react';
import { handleChangeFileName } from 'util/fileActions';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store/store';

interface ChangeFileNameDialogProps {
  readonly open: boolean;
  readonly setOpenChangeFileNameDialog: Dispatch<SetStateAction<boolean>>;
  readonly fileName: string;
  readonly setFileName: Dispatch<SetStateAction<string>>;
  readonly setFileType: Dispatch<SetStateAction<string>>;
}

const ChangeFileNameDialog: React.FC<ChangeFileNameDialogProps> = ({
  open,
  setOpenChangeFileNameDialog,
  fileName,
  setFileName,
  setFileType,
}) => {
  const [modifiedFileName, setModifiedFileName] = useState(fileName);
  const [prevFileName, setPrevFileName] = useState(fileName);
  const [errorChangeMessage, setErrorChangeMessage] = useState('');

  // Adjusting state when a prop changes (React's recommended pattern over useEffect)
  if (prevFileName !== fileName) {
    setPrevFileName(fileName);
    setModifiedFileName(fileName);
  }

  const files = useSelector((state: RootState) => state.files);
  const dispatch = useDispatch();

  const handleCloseChangeFileNameDialog = () => {
    setOpenChangeFileNameDialog(false);
    setErrorChangeMessage('');
    setModifiedFileName(fileName);
  };

  return (
    <Dialog open={open} onClose={setOpenChangeFileNameDialog}>
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
          slotProps={{
            htmlInput: {
              'data-logger-element': 'input',
              'data-logger-label': 'Rename File Input',
            },
          }}
        />
        <Typography style={{ color: 'red' }}>{errorChangeMessage}</Typography>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => handleCloseChangeFileNameDialog()}
          color="primary"
          data-logger-element="button"
          data-logger-label="Rename File Cancel"
        >
          Cancel
        </Button>
        <Button
          onClick={() =>
            handleChangeFileName({
              files,
              modifiedFileName,
              currentFileName: fileName,
              setFileName,
              setFileType,
              setErrorMessage: setErrorChangeMessage,
              setOpenDialog: setOpenChangeFileNameDialog,
              dispatch,
            })
          }
          color="secondary"
          data-logger-element="button"
          data-logger-label="Rename File Confirm"
        >
          Change
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChangeFileNameDialog;
