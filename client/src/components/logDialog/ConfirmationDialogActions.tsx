import { DialogActions } from '@mui/material';
import type { LogContext } from 'util/logger/logEvent';
import LoggedDialogButton from 'components/logDialog/LoggedDialogButton';

interface ConfirmationDialogActionsProps {
  readonly cancelContext: LogContext;
  readonly confirmContext: LogContext;
  readonly confirmLabel: string;
  readonly confirmText: string;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}

function ConfirmationDialogActions({
  cancelContext,
  confirmContext,
  confirmLabel,
  confirmText,
  onClose,
  onConfirm,
}: ConfirmationDialogActionsProps) {
  return (
    <DialogActions>
      <LoggedDialogButton
        onClick={onClose}
        color="primary"
        label="Cancel"
        context={cancelContext}
        text="Cancel"
      />
      <LoggedDialogButton
        onClick={onConfirm}
        color="error"
        label={confirmLabel}
        context={confirmContext}
        text={confirmText}
      />
    </DialogActions>
  );
}

export default ConfirmationDialogActions;
