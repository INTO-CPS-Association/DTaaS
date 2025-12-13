import { Dispatch, SetStateAction } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { createDigitalTwinFromData } from 'model/backend/util/digitalTwinAdapter';
import { selectDigitalTwinByName } from 'store/selectors/digitalTwin.selectors';
import DigitalTwin, { formatName } from 'model/backend/digitalTwin';
import { showSnackbar } from 'store/snackbar.slice';

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
  const digitalTwinData = useSelector(selectDigitalTwinByName(name));
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
          onClick={async () => {
            if (digitalTwinData) {
              try {
                const digitalTwinInstance = await createDigitalTwinFromData(
                  digitalTwinData,
                  name,
                );

                if (!digitalTwinInstance) {
                  dispatch(
                    showSnackbar({
                      message: `Error: Failed to initialize digital twin ${name}`,
                      severity: 'error',
                    }),
                  );
                  setShowDialog(false);
                  return;
                }

                handleDelete(
                  digitalTwinInstance,
                  setShowDialog,
                  onDelete,
                  dispatch,
                );
              } catch (error) {
                dispatch(
                  showSnackbar({
                    message: `Error: Failed to delete digital twin ${name}: ${error}`,
                    severity: 'error',
                  }),
                );
                setShowDialog(false);
              }
            }
          }}
        >
          Yes
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default DeleteDialog;
