import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import ExecutionHistoryList from 'components/execution/ExecutionHistoryList';

interface UnifiedDialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly dtName: string;
  readonly onClose: () => void;
  readonly onClearAll: () => void;
  readonly onViewLogs: () => void;
  readonly deleteAllDialog: React.ReactNode;
}

function UnifiedDialog({
  open,
  title,
  dtName,
  onClose,
  onClearAll,
  onViewLogs,
  deleteAllDialog,
}: UnifiedDialogProps) {
  return (
    <Dialog open={open} maxWidth="md" fullWidth onClose={onClose}>
      {deleteAllDialog}
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <ExecutionHistoryList dtName={dtName} onViewLogs={onViewLogs} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClearAll} color="error">
          Clear All
        </Button>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default UnifiedDialog;
