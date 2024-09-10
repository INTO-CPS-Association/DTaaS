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
    checkFirstPipelineStatus(
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
    );
  } else {
    setButtonText('Start');
  }
};

export const checkFirstPipelineStatus = async (
  setButtonText: Dispatch<SetStateAction<string>>,
  digitalTwin: DigitalTwin,
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  const pipelineStatus = await digitalTwin.gitlabInstance.getPipelineStatus(
    digitalTwin.gitlabInstance.projectId!,
    digitalTwin.pipelineId!,
  );

  if (pipelineStatus === 'success' || pipelineStatus === 'failed') {
    await checkSecondPipelineStatus(
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
    );
  } else {
    retryPipelineCheck(
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
    );
  }
};

const retryPipelineCheck = (
  setButtonText: Dispatch<SetStateAction<string>>,
  digitalTwin: DigitalTwin,
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  setTimeout(
    () =>
      checkFirstPipelineStatus(
        setButtonText,
        digitalTwin,
        setLogButtonDisabled,
        dispatch,
      ),
    5000,
  );
};

export const checkSecondPipelineStatus = async (
  setButtonText: Dispatch<SetStateAction<string>>,
  digitalTwin: DigitalTwin,
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>,
  dispatch: ReturnType<typeof useDispatch>,
) => {
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
  } else {
    setTimeout(
      () =>
        checkSecondPipelineStatus(
          setButtonText,
          digitalTwin,
          setLogButtonDisabled,
          dispatch,
        ),
      5000,
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
    setSnackbarMessage(
      `Execution stopped successfully for ${formatName(digitalTwin.DTName)} (Run #${digitalTwin.executionCount})`,
    );
    setSnackbarSeverity('success');
  } catch (error) {
    setSnackbarMessage(
      `Execution stop failed for ${digitalTwin.DTName} (Run #${digitalTwin.executionCount})`,
    );
    setSnackbarSeverity('error');
  } finally {
    setSnackbarOpen(true);
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
