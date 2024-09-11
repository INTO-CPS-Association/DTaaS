import * as React from 'react';
import { Dispatch, SetStateAction } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { selectDigitalTwinByName } from 'store/digitalTwin.slice';
import DigitalTwin, { formatName } from 'util/gitlabDigitalTwin';
import { showSnackbar } from 'store/snackbar.slice';

interface DeleteDialogProps {
  showLog: boolean;
  setShowLog: Dispatch<SetStateAction<boolean>>;
  name: string;
  onDelete: () => void;
}

const handleCloseLog = (setShowLog: Dispatch<SetStateAction<boolean>>) => {
  setShowLog(false);
};

const handleDelete = async (
  digitalTwin: DigitalTwin,
  setShowLog: Dispatch<SetStateAction<boolean>>,
  onDelete: () => void,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  const returnMessage = await digitalTwin.delete();
  onDelete();
  setShowLog(false);
  dispatch(
    showSnackbar({
      message: returnMessage,
      severity: returnMessage.includes('Error') ? 'error' : 'success',
    }),
  );
};

function DeleteDialog({
  showLog,
  setShowLog,
  name,
  onDelete,
}: DeleteDialogProps) {
  const dispatch = useDispatch();
  const digitalTwin = useSelector(selectDigitalTwinByName(name));
  return (
    <Dialog
      open={showLog}
      onClose={() => handleCloseLog(setShowLog)}
      maxWidth="md"
    >
      <DialogContent>
        <Typography variant="body2">
          This step is irreversible. Would you like to delete{' '}
          <strong>{formatName(name)}</strong> digital twin?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button color="primary" onClick={() => handleCloseLog(setShowLog)}>
          Cancel
        </Button>
        <Button
          color="primary"
          onClick={() =>
            handleDelete(digitalTwin, setShowLog, onDelete, dispatch)
          }
        >
          Yes
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default DeleteDialog;
