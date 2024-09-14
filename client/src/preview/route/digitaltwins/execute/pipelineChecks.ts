import { Dispatch, SetStateAction } from 'react';
import { useDispatch } from 'react-redux';
import { AlertColor } from '@mui/material';
import DigitalTwin, { formatName } from 'util/gitlabDigitalTwin';
import { fetchJobLogs, updatePipelineStateOnCompletion } from 'preview/route/digitaltwins/execute/pipelineUtils';
import { setSnackbar } from 'preview/route/digitaltwins/execute/pipelineHandler';

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

export const handleTimeout = (
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

export const checkFirstPipelineStatus = async ({
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

export const handlePipelineCompletion = async (
  pipelineId: number,
  digitalTwin: DigitalTwin,
  setButtonText: Dispatch<SetStateAction<string>>,
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>,
  dispatch: ReturnType<typeof useDispatch>,
  setSnackbarMessage: Dispatch<SetStateAction<string>>,
  setSnackbarSeverity: Dispatch<SetStateAction<AlertColor>>,
  setSnackbarOpen: Dispatch<SetStateAction<boolean>>,
  pipelineStatus: 'success' | 'failed'
) => {
  const jobLogs = await fetchJobLogs(digitalTwin.gitlabInstance, pipelineId);
  updatePipelineStateOnCompletion(digitalTwin, jobLogs, setButtonText, setLogButtonDisabled, dispatch);
  if (pipelineStatus === 'failed') {
    setSnackbar(
      `Execution failed for ${formatName(digitalTwin.DTName)}`,
      'error',
      setSnackbarMessage,
      setSnackbarSeverity,
      setSnackbarOpen,
    );
  }
};

export const checkSecondPipelineStatus = async ({
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
  const pipelineId = digitalTwin.pipelineId! + 1;
  const pipelineStatus = await digitalTwin.gitlabInstance.getPipelineStatus(
    digitalTwin.gitlabInstance.projectId!,
    pipelineId,
  );

  if (pipelineStatus === 'success' || pipelineStatus === 'failed') {
    await handlePipelineCompletion(
      pipelineId,
      digitalTwin,
      setButtonText,
      setLogButtonDisabled,
      dispatch,
      setSnackbarMessage,
      setSnackbarSeverity,
      setSnackbarOpen,
      pipelineStatus
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
  }
};


export const startPipelineStatusCheck = (
  params: PipelineStatusParams & {
    setSnackbarMessage: Dispatch<SetStateAction<string>>;
    setSnackbarSeverity: Dispatch<SetStateAction<AlertColor>>;
    setSnackbarOpen: Dispatch<SetStateAction<boolean>>;
  },
) => {
  const startTime = Date.now();
  checkFirstPipelineStatus({ ...params, startTime });
};
