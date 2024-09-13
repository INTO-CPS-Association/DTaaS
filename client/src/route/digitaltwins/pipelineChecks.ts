import { Dispatch, SetStateAction } from 'react';
import { useDispatch } from 'react-redux';
import { AlertColor } from '@mui/material';
import DigitalTwin, { formatName } from 'util/gitlabDigitalTwin';
import { fetchJobLogs, updatePipelineStateOnCompletion } from './pipelineUtils';
import { setSnackbar } from './pipelineHandler';

interface PipelineStatusParams {
  setButtonText: Dispatch<SetStateAction<string>>;
  digitalTwin: DigitalTwin;
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>;
  dispatch: ReturnType<typeof useDispatch>;
}

const MAX_EXECUTION_TIME = 10 * 60 * 1000;
const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const hasTimedOut = (startTime: number) =>
  Date.now() - startTime > MAX_EXECUTION_TIME;

const handleTimeout = (
  DTName: string,
  setButtonText: Dispatch<SetStateAction<string>>,
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>,
  setSnackbarMessage: Dispatch<SetStateAction<string>>,
  setSnackbarSeverity: Dispatch<SetStateAction<AlertColor>>,
  setSnackbarOpen: Dispatch<SetStateAction<boolean>>,
) => {
  setSnackbar(
    `Execution timed out for ${formatName(DTName)}`,
    'error',
    setSnackbarMessage,
    setSnackbarSeverity,
    setSnackbarOpen,
  );
  setButtonText('Start');
  setLogButtonDisabled(false);
};

const checkFirstPipelineStatus = async ({
  setButtonText,
  digitalTwin,
  setLogButtonDisabled,
  dispatch,
  startTime,
  setSnackbarMessage,
  setSnackbarSeverity,
  setSnackbarOpen,
}: PipelineStatusParams & {
  startTime: number;
  setSnackbarMessage: Dispatch<SetStateAction<string>>;
  setSnackbarSeverity: Dispatch<SetStateAction<AlertColor>>;
  setSnackbarOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  const pipelineStatus = await digitalTwin.gitlabInstance.getPipelineStatus(
    digitalTwin.gitlabInstance.projectId!,
    digitalTwin.pipelineId!,
  );

  if (pipelineStatus === 'success') {
    await checkSecondPipelineStatus({
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
      startTime,
      setSnackbarMessage,
      setSnackbarSeverity,
      setSnackbarOpen,
    });
  } else if (pipelineStatus === 'failed') {
    const jobLogs = await fetchJobLogs(
      digitalTwin.gitlabInstance,
      digitalTwin.pipelineId!,
    );
    updatePipelineStateOnCompletion(
      digitalTwin,
      jobLogs,
      setButtonText,
      setLogButtonDisabled,
      dispatch,
    );
  } else if (hasTimedOut(startTime)) {
    handleTimeout(
      digitalTwin.DTName,
      setButtonText,
      setLogButtonDisabled,
      setSnackbarMessage,
      setSnackbarSeverity,
      setSnackbarOpen,
    );
  } else {
    await delay(5000);
    checkFirstPipelineStatus({
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
      startTime,
      setSnackbarMessage,
      setSnackbarSeverity,
      setSnackbarOpen,
    });
  }
};

const checkSecondPipelineStatus = async ({
  setButtonText,
  digitalTwin,
  setLogButtonDisabled,
  dispatch,
  startTime,
  setSnackbarMessage,
  setSnackbarSeverity,
  setSnackbarOpen,
}: PipelineStatusParams & {
  startTime: number;
  setSnackbarMessage: Dispatch<SetStateAction<string>>;
  setSnackbarSeverity: Dispatch<SetStateAction<AlertColor>>;
  setSnackbarOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  const pipelineStatus = await digitalTwin.gitlabInstance.getPipelineStatus(
    digitalTwin.gitlabInstance.projectId!,
    digitalTwin.pipelineId! + 1,
  );

  if (pipelineStatus === 'success' || pipelineStatus === 'failed') {
    const pipelineIdJobs = digitalTwin.pipelineId! + 1;
    const jobLogs = await fetchJobLogs(
      digitalTwin.gitlabInstance,
      pipelineIdJobs,
    );
    updatePipelineStateOnCompletion(
      digitalTwin,
      jobLogs,
      setButtonText,
      setLogButtonDisabled,
      dispatch,
    );

    if (pipelineStatus === 'failed') {
      setSnackbar(
        `Execution failed for ${formatName(digitalTwin.DTName)}`,
        'error',
        setSnackbarMessage,
        setSnackbarSeverity,
        setSnackbarOpen,
      );
    }
  } else if (hasTimedOut(startTime)) {
    handleTimeout(
      digitalTwin.DTName,
      setButtonText,
      setLogButtonDisabled,
      setSnackbarMessage,
      setSnackbarSeverity,
      setSnackbarOpen,
    );
  } else {
    await delay(5000);
    checkSecondPipelineStatus({
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
      startTime,
      setSnackbarMessage,
      setSnackbarSeverity,
      setSnackbarOpen,
    });
  }
};

const startPipelineStatusCheck = (
  params: PipelineStatusParams & {
    setSnackbarMessage: Dispatch<SetStateAction<string>>;
    setSnackbarSeverity: Dispatch<SetStateAction<AlertColor>>;
    setSnackbarOpen: Dispatch<SetStateAction<boolean>>;
  },
) => {
  const startTime = Date.now();
  checkFirstPipelineStatus({ ...params, startTime });
};

export default startPipelineStatusCheck;
