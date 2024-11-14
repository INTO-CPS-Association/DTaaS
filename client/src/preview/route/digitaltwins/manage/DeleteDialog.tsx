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
import { selectDigitalTwinByName } from '../../../store/digitalTwin.slice';
import DigitalTwin, { formatName } from '../../../util/digitalTwin';
import { showSnackbar } from '../../../store/snackbar.slice';

interface DeleteDialogProps {
  showDialog: boolean;
  setShowDialog: Dispatch<SetStateAction<boolean>>;
  name: string;
  onDelete: () => void;
}

const handleCloseDeleteDialog = (
  setShowLog: Dispatch<SetStateAction<boolean>>,
) => {
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
  showDialog,
  setShowDialog,
  name,
  onDelete,
}: DeleteDialogProps) {
  const dispatch = useDispatch();
  const digitalTwin = useSelector(selectDigitalTwinByName(name));
  return (
    <Dialog open={showDialog} maxWidth="md">
      <DialogContent>
        <Typography variant="body2">
          This step is irreversible. Would you like to delete{' '}
          <strong>{formatName(name)}</strong> digital twin?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button
          color="primary"
          onClick={() => handleCloseDeleteDialog(setShowDialog)}
        >
          Cancel
        </Button>
        <Button
          color="primary"
          onClick={() =>
            handleDelete(digitalTwin, setShowDialog, onDelete, dispatch)
          }
        >
          Yes
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default DeleteDialog;
