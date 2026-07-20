import { Button } from '@mui/material';
import type { ButtonProps } from '@mui/material';
import type { LogContext } from 'util/logger/logEvent';

interface LoggedDialogButtonProps {
  readonly color: ButtonProps['color'];
  readonly context: LogContext;
  readonly label: string;
  readonly onClick: () => void;
  readonly text: string;
}

function LoggedDialogButton({
  color,
  context,
  label,
  onClick,
  text,
}: LoggedDialogButtonProps) {
  return (
    <Button
      onClick={onClick}
      color={color}
      data-logger-element="button"
      data-logger-label={label}
      data-logger-context={JSON.stringify(context)}
    >
      {text}
    </Button>
  );
}

export default LoggedDialogButton;
