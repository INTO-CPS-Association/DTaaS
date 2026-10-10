import { Dispatch, SetStateAction, useState, useCallback } from 'react';
import { Button, CircularProgress, Box } from '@mui/material';
import { handleStart } from 'route/digitaltwins/execution';
import { useSelector, useDispatch } from 'react-redux';
import { showSnackbar } from 'store/snackbar.slice';
import {
  formatName,
  selectExecutionHistoryByDTName,
  createDigitalTwinFromData,
  ExecutionStatus,
  DEBOUNCE_TIME,
  DTExecutionResult,
} from '@into-cps-association/dt-automation';
import { selectDigitalTwinByName } from 'store/selectors/digitalTwin.selectors';

interface StartButtonProps {
  readonly assetName: string;
  readonly setHistoryButtonDisabled: Dispatch<SetStateAction<boolean>>;
}

// Helper to get running executions from execution list
const getRunningExecutions = (executions: DTExecutionResult[]) => {
  if (!Array.isArray(executions)) return [];
  return executions.filter(
    (execution) => execution.status === ExecutionStatus.RUNNING,
  );
};

// Helper to determine if button should show loading state
const shouldShowLoading = (
  hasRunningExecutions: boolean,
  hasAnyExecutions: boolean,
  isPipelineLoading: boolean | undefined,
) => hasRunningExecutions || (!hasAnyExecutions && isPipelineLoading);

const buildStartLogContext = (
  assetName: string,
  executions: DTExecutionResult[],
) =>
  JSON.stringify({
    dt: {
      name: assetName,
      button: 'start',
      history: executions.map((execution) =>
        new Date(execution.timestamp).toISOString(),
      ),
    },
  });

function StartButton({
  assetName,
  setHistoryButtonDisabled,
}: StartButtonProps) {
  const dispatch = useDispatch();
  const digitalTwin = useSelector(selectDigitalTwinByName(assetName));
  const executions =
    useSelector(selectExecutionHistoryByDTName(assetName)) || [];

  const [isDebouncing, setIsDebouncing] = useState(false);

  const runningExecutions = getRunningExecutions(executions);
  const hasRunningExecutions = runningExecutions.length > 0;
  const hasAnyExecutions = executions.length > 0;

  const isLoading = shouldShowLoading(
    hasRunningExecutions,
    hasAnyExecutions,
    digitalTwin?.pipelineLoading,
  );

  const runningCount = runningExecutions.length;

  const handleDebouncedClick = useCallback(async () => {
    if (isDebouncing || !digitalTwin) return;

    setIsDebouncing(true);

    dispatch(
      showSnackbar({
        message: `Starting execution for ${formatName(assetName)}...`,
        severity: 'success',
        icon: 'PlayArrowIcon',
      }),
    );

    try {
      const digitalTwinInstance = await createDigitalTwinFromData(
        digitalTwin,
        assetName,
      );

      const setButtonText = () => {};
      await handleStart(
        'Start',
        setButtonText,
        digitalTwinInstance,
        setHistoryButtonDisabled,
        dispatch,
      );
    } finally {
      setTimeout(() => setIsDebouncing(false), DEBOUNCE_TIME);
    }
  }, [
    isDebouncing,
    digitalTwin,
    assetName,
    setHistoryButtonDisabled,
    dispatch,
  ]);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      {isLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
          <CircularProgress size={22} data-testid="circular-progress" />
          {runningCount > 0 && (
            <Box component="span" sx={{ ml: 0.5, fontSize: '0.75rem' }}>
              ({runningCount})
            </Box>
          )}
        </Box>
      )}
      <Button
        variant="contained"
        size="small"
        color="primary"
        disabled={isDebouncing}
        onClick={handleDebouncedClick}
        data-logger-element="button"
        data-logger-label="Start"
        data-logger-context={buildStartLogContext(assetName, executions)}
      >
        Start
      </Button>
    </Box>
  );
}

export default StartButton;
