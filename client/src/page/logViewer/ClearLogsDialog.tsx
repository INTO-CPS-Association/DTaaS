import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

interface ClearLogsDialogProps {
  open: boolean;
  logCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

function ClearLogsDialog({
  open,
  logCount,
  onCancel,
  onConfirm,
}: Readonly<ClearLogsDialogProps>) {
  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>Clear all logs?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          This will permanently delete all {logCount}{' '}
          {logCount === 1 ? 'log entry' : 'log entries'} from local storage.
          This cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} data-testid="cancel-clear-logs">
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          color="error"
          variant="contained"
          data-testid="confirm-clear-logs"
        >
          Clear Logs
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ClearLogsDialog;
