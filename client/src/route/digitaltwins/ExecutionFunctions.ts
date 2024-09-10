import { Dispatch, SetStateAction } from 'react';
import { AlertColor } from '@mui/material';
import DigitalTwin, { formatName } from 'util/gitlabDigitalTwin';
import { GitlabInstance } from 'util/gitlab';
import stripAnsi from 'strip-ansi';
import {
  incrementExecutionCount,
  setJobLogs,
  setPipelineCompleted,
  setPipelineLoading,
} from 'store/digitalTwin.slice';
import { useDispatch } from 'react-redux';

interface PipelineStatusParams {
  setButtonText: Dispatch<SetStateAction<string>>;
  digitalTwin: DigitalTwin;
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>;
  dispatch: ReturnType<typeof useDispatch>;
}

export const handleButtonClick = (
  buttonText: string,
  setButtonText: Dispatch<SetStateAction<string>>,
  digitalTwin: DigitalTwin,
  setSnackbarMessage: Dispatch<SetStateAction<string>>,
  setSnackbarSeverity: Dispatch<SetStateAction<AlertColor>>,
  setSnackbarOpen: Dispatch<SetStateAction<boolean>>,
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  if (buttonText === 'Start') {
    handleStart(
      buttonText,
      setButtonText,
      setSnackbarMessage,
      setSnackbarSeverity,
      setSnackbarOpen,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
    );
  } else {
    handleStop(
      digitalTwin,
      setSnackbarMessage,
      setSnackbarSeverity,
      setSnackbarOpen,
      setButtonText,
      dispatch,
    );
  }
};

const startPipeline = async (
  digitalTwin: DigitalTwin,
  setSnackbarMessage: Dispatch<SetStateAction<string>>,
  setSnackbarSeverity: Dispatch<SetStateAction<AlertColor>>,
  setSnackbarOpen: Dispatch<SetStateAction<boolean>>,
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  await digitalTwin.execute();
  dispatch(incrementExecutionCount({ assetName: digitalTwin.DTName }));
  const executionStatusMessage =
    digitalTwin.lastExecutionStatus === 'success'
      ? `Execution started successfully for ${formatName(digitalTwin.DTName)} (Run #${digitalTwin.executionCount}). Wait until completion for the logs...`
      : `Execution ${digitalTwin.lastExecutionStatus} for ${formatName(digitalTwin.DTName)} (Run #${digitalTwin.executionCount})`;
  setSnackbarMessage(executionStatusMessage);
  setSnackbarSeverity(
    digitalTwin.lastExecutionStatus === 'success' ? 'success' : 'error',
  );
  setSnackbarOpen(true);
};

const updatePipelineState = (
  digitalTwin: DigitalTwin,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  dispatch(
    setPipelineCompleted({
      assetName: digitalTwin.DTName,
      pipelineCompleted: false,
    }),
  );
  dispatch(
    setPipelineLoading({
      assetName: digitalTwin.DTName,
      pipelineLoading: true,
    }),
  );
};

export const handleStart = async (
  buttonText: string,
  setButtonText: Dispatch<SetStateAction<string>>,
  setSnackbarMessage: Dispatch<SetStateAction<string>>,
  setSnackbarSeverity: Dispatch<SetStateAction<AlertColor>>,
  setSnackbarOpen: Dispatch<SetStateAction<boolean>>,
  digitalTwin: DigitalTwin,
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  if (buttonText === 'Start') {
    setButtonText('Stop');
    setLogButtonDisabled(true);
    updatePipelineState(digitalTwin, dispatch);
    await startPipeline(
      digitalTwin,
      setSnackbarMessage,
      setSnackbarSeverity,
      setSnackbarOpen,
      setLogButtonDisabled,
      dispatch,
    );
    const params: PipelineStatusParams = {
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
    };
    checkFirstPipelineStatus(params);
  } else {
    setButtonText('Start');
  }
};

export const checkFirstPipelineStatus = async ({
  setButtonText,
  digitalTwin,
  setLogButtonDisabled,
  dispatch,
}: PipelineStatusParams) => {
  const pipelineStatus = await digitalTwin.gitlabInstance.getPipelineStatus(
    digitalTwin.gitlabInstance.projectId!,
    digitalTwin.pipelineId!,
  );
  const params: PipelineStatusParams = {
    setButtonText,
    digitalTwin,
    setLogButtonDisabled,
    dispatch,
  };
  if (pipelineStatus === 'success' || pipelineStatus === 'failed') {
    await checkSecondPipelineStatus(params);
  } else {
    retryPipelineCheck(params);
  }
};

const retryPipelineCheck = ({
  setButtonText,
  digitalTwin,
  setLogButtonDisabled,
  dispatch,
}: PipelineStatusParams) => {
  const params: PipelineStatusParams = {
    setButtonText,
    digitalTwin,
    setLogButtonDisabled,
    dispatch,
  };
  setTimeout(() => checkFirstPipelineStatus(params), 5000);
};

const updatePipelineStateOnCompletion = (
  digitalTwin: DigitalTwin,
  jobLogs: any[],
  setButtonText: Dispatch<SetStateAction<string>>,
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  dispatch(setJobLogs({ assetName: digitalTwin.DTName, jobLogs }));
  dispatch(
    setPipelineCompleted({
      assetName: digitalTwin.DTName,
      pipelineCompleted: true,
    }),
  );
  dispatch(
    setPipelineLoading({
      assetName: digitalTwin.DTName,
      pipelineLoading: false,
    }),
  );
  setButtonText('Start');
  setLogButtonDisabled(false);
};

const retrySecondPipelineCheck = (
  setButtonText: Dispatch<SetStateAction<string>>,
  digitalTwin: DigitalTwin,
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  const params: PipelineStatusParams = {
    setButtonText,
    digitalTwin,
    setLogButtonDisabled,
    dispatch,
  };
  setTimeout(() => checkSecondPipelineStatus(params), 5000);
};

export const checkSecondPipelineStatus = async ({
  setButtonText,
  digitalTwin,
  setLogButtonDisabled,
  dispatch,
}: PipelineStatusParams) => {
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
  } else {
    retrySecondPipelineCheck(
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
    );
  }
};

export const fetchJobLogs = async (
  gitlabInstance: GitlabInstance,
  pipelineId: number,
) => {
  const jobs = await gitlabInstance.getPipelineJobs(
    gitlabInstance.projectId!,
    pipelineId,
  );
  const logPromises = jobs.map(async (job) => {
    let log = await gitlabInstance.getJobTrace(
      gitlabInstance.projectId!,
      job.id,
    );
    if (typeof log === 'string') {
      log = stripAnsi(log)
        .split('\n')
        .map((line: string) =>
          line
            .replace(/section_start:\d+:[^A-Z]*/, '')
            .replace(/section_end:\d+:[^A-Z]*/, ''),
        )
        .join('\n');
    }
    return { jobName: job.name, log };
  });
  return (await Promise.all(logPromises)).reverse();
};

const updatePipelineStateOnStop = (
  digitalTwin: DigitalTwin,
  setButtonText: Dispatch<SetStateAction<string>>,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  setButtonText('Start');
  dispatch(
    setPipelineCompleted({
      assetName: digitalTwin.DTName,
      pipelineCompleted: true,
    }),
  );
  dispatch(
    setPipelineLoading({
      assetName: digitalTwin.DTName,
      pipelineLoading: false,
    }),
  );
};

const setSnackbar = (
  message: string,
  severity: AlertColor,
  setSnackbarMessage: Dispatch<SetStateAction<string>>,
  setSnackbarSeverity: Dispatch<SetStateAction<AlertColor>>,
  setSnackbarOpen: Dispatch<SetStateAction<boolean>>,
) => {
  setSnackbarMessage(message);
  setSnackbarSeverity(severity);
  setSnackbarOpen(true);
};

export const handleStop = async (
  digitalTwin: DigitalTwin,
  setSnackbarMessage: Dispatch<SetStateAction<string>>,
  setSnackbarSeverity: Dispatch<SetStateAction<AlertColor>>,
  setSnackbarOpen: Dispatch<SetStateAction<boolean>>,
  setButtonText: Dispatch<SetStateAction<string>>,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  try {
    await stopPipelines(digitalTwin);
    setSnackbar(
      `Execution stopped successfully for ${formatName(digitalTwin.DTName)} (Run #${digitalTwin.executionCount})`,
      'success',
      setSnackbarMessage,
      setSnackbarSeverity,
      setSnackbarOpen,
    );
  } catch (error) {
    setSnackbar(
      `Execution stop failed for ${digitalTwin.DTName} (Run #${digitalTwin.executionCount})`,
      'error',
      setSnackbarMessage,
      setSnackbarSeverity,
      setSnackbarOpen,
    );
  } finally {
    updatePipelineStateOnStop(digitalTwin, setButtonText, dispatch);
  }
};

const stopPipelines = async (digitalTwin: DigitalTwin) => {
  if (digitalTwin.gitlabInstance.projectId && digitalTwin.pipelineId) {
    await digitalTwin.stop(
      digitalTwin.gitlabInstance.projectId,
      digitalTwin.pipelineId,
    );
    await digitalTwin.stop(
      digitalTwin.gitlabInstance.projectId,
      digitalTwin.pipelineId + 1,
    );
  }
};
