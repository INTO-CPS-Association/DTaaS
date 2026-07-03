import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

interface InterruptedSessionDialogProps {
  open: boolean;
  onClose: () => void;
}

function InterruptedSessionDialog({
  open,
  onClose,
}: Readonly<InterruptedSessionDialogProps>) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Previous session interrupted</DialogTitle>
      <DialogContent>
        <DialogContentText>
          A measurement was running when you last left this page. Active tasks
          have been marked as stopped. You can restart or export any partial
          results.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          variant="contained"
          data-logger-element="button"
          data-logger-label="Dismiss Interrupted Session Dialog"
        >
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default InterruptedSessionDialog;
