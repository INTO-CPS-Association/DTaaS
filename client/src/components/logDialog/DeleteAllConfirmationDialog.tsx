import { Dialog, DialogTitle, DialogContent, Typography } from '@mui/material';
import { logDismiss } from 'util/logger/logger';
import ConfirmationDialogActions from 'components/logDialog/ConfirmationDialogActions';

interface DeleteAllConfirmationDialogProps {
  open: boolean;
  dtName: string;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteAllConfirmationDialog: React.FC<
  DeleteAllConfirmationDialogProps
> = ({ open, dtName, onClose, onConfirm }) => (
  <Dialog
    open={open}
    onClose={(_event, reason) => {
      logDismiss({
        element: 'dialog',
        label: 'Confirm Clear All',
        reason,
        context: { dt: { name: dtName } },
      });
      onClose();
    }}
  >
    <DialogTitle>Confirm Clear All</DialogTitle>
    <DialogContent>
      <Typography>
        Are you sure you want to delete <strong>all</strong> execution history
        entries for <strong>{dtName}</strong>?<br />
        <br />
        This action cannot be undone.
      </Typography>
    </DialogContent>
    <ConfirmationDialogActions
      cancelContext={{ dt: { name: dtName, button: 'clear-all-cancel' } }}
      confirmContext={{ dt: { name: dtName, button: 'clear-all-confirm' } }}
      confirmLabel="Delete All"
      confirmText="Delete All"
      onClose={onClose}
      onConfirm={onConfirm}
    />
  </Dialog>
);

export default DeleteAllConfirmationDialog;
