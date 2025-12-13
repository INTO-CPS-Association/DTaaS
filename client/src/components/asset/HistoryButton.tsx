import { Dispatch, SetStateAction } from 'react';
import { Button, Badge } from '@mui/material';
import { useSelector } from 'react-redux';
import { selectExecutionHistoryByDTName } from 'model/backend/state/executionHistory.selectors';

interface HistoryButtonProps {
  readonly setShowLog: Dispatch<React.SetStateAction<boolean>>;
  readonly historyButtonDisabled: boolean;
  readonly assetName: string;
}

export const handleToggleHistory = (
  setShowLog: Dispatch<SetStateAction<boolean>>,
) => {
  setShowLog((prev) => !prev);
};

function HistoryButton({
  setShowLog,
  historyButtonDisabled,
  assetName,
}: HistoryButtonProps) {
  const executions =
    useSelector(selectExecutionHistoryByDTName(assetName)) || [];

  const executionCount = Array.isArray(executions) ? executions.length : 0;

  return (
    <Badge
      badgeContent={Math.max(executionCount, 0)}
      color="secondary"
      overlap="circular"
      invisible={executionCount === 0}
    >
      <Button
        variant="contained"
        size="small"
        color="primary"
        onClick={() => handleToggleHistory(setShowLog)}
        disabled={historyButtonDisabled && executionCount === 0}
      >
        History
      </Button>
    </Badge>
  );
}

export default HistoryButton;
