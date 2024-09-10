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

export const startPipeline = async (
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

export const updatePipelineState = (
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

export const updatePipelineStateOnCompletion = (
  digitalTwin: DigitalTwin,
  jobLogs: { jobName: string; log: string }[],
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

export const updatePipelineStateOnStop = (
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
