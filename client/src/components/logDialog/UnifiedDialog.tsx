import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import ExecutionHistoryList from 'components/execution/ExecutionHistoryList';
import LoggedDialogButton from 'components/logDialog/LoggedDialogButton';
import { logDismiss } from 'util/logger/logger';

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
    <Dialog
      open={open}
      maxWidth="md"
      fullWidth
      onClose={(_event, reason) => {
        logDismiss({
          element: 'dialog',
          label: title,
          reason,
          context: { dt: { name: dtName } },
        });
        onClose();
      }}
    >
      {deleteAllDialog}
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <ExecutionHistoryList dtName={dtName} onViewLogs={onViewLogs} />
      </DialogContent>
      <DialogActions>
        <LoggedDialogButton
          onClick={onClearAll}
          color="error"
          label="Clear All"
          context={{ dt: { name: dtName, button: 'clear-all-executions' } }}
          text="Clear All"
        />
        <LoggedDialogButton
          onClick={onClose}
          color="primary"
          label="Close"
          context={{ dt: { name: dtName, button: 'close-history' } }}
          text="Close"
        />
      </DialogActions>
    </Dialog>
  );
}

export default UnifiedDialog;
