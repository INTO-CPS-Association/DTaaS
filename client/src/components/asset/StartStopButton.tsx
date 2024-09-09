import React, { useState, Dispatch, SetStateAction, useEffect } from 'react';
import { AlertColor, Button, CircularProgress } from '@mui/material';
import { handleButtonClick } from 'route/digitaltwins/ExecutionFunctions';
import { useSelector } from 'react-redux';
import { RootState } from 'store/store';

export interface JobLog {
  jobName: string;
  log: string;
}

interface StartStopButtonProps {
  assetName: string;
  setSnackbarOpen: Dispatch<SetStateAction<boolean>>;
  setSnackbarMessage: Dispatch<SetStateAction<string>>;
  setSnackbarSeverity: Dispatch<SetStateAction<AlertColor>>;
  executionCount: number;
  setExecutionCount: Dispatch<SetStateAction<number>>;
  setJobLogs: Dispatch<SetStateAction<JobLog[]>>;
  setPipelineCompleted: Dispatch<SetStateAction<boolean>>;
}

function StartStopButton({
  assetName,
  setSnackbarOpen,
  setSnackbarMessage,
  setSnackbarSeverity,
  executionCount,
  setExecutionCount,
  setJobLogs,
  setPipelineCompleted,
}: StartStopButtonProps) {
  const [executionStatus, setExecutionStatus] = useState<string | null>(null);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [buttonText, setButtonText] = useState('Start');

  const digitalTwin = useSelector(
    (state: RootState) => state.digitalTwin[assetName],
  );

  useEffect(() => {
    if (executionStatus) {
      setSnackbarMessage(
        `Execution ${executionStatus} for ${digitalTwin.DTName} (Run #${executionCount})`,
      );
      setSnackbarSeverity(executionStatus === 'success' ? 'success' : 'error');
      setSnackbarOpen(true);
    }
  }, [executionStatus, executionCount]);

  return (
    <>
      {pipelineLoading ? (
        <CircularProgress size={22} style={{ marginRight: '8px' }} />
      ) : null}{' '}
      <Button
        variant="contained"
        size="small"
        color="primary"
        onClick={() =>
          handleButtonClick(
            buttonText,
            setButtonText,
            setJobLogs,
            setPipelineCompleted,
            setPipelineLoading,
            setExecutionStatus,
            setExecutionCount,
            digitalTwin,
            setSnackbarMessage,
            setSnackbarSeverity,
            setSnackbarOpen,
            executionCount,
          )
        }
      >
        {buttonText}
      </Button>
    </>
  );
}

export default StartStopButton;
