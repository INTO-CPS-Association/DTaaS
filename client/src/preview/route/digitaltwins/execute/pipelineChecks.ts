import { Dispatch, SetStateAction } from 'react';
import { useDispatch } from 'react-redux';
import DigitalTwin, { formatName } from 'util/gitlabDigitalTwin';
import {
  fetchJobLogs,
  updatePipelineStateOnCompletion,
} from 'preview/route/digitaltwins/execute/pipelineUtils';
import { showSnackbar } from 'store/snackbar.slice';

interface PipelineStatusParams {
  setButtonText: Dispatch<SetStateAction<string>>;
  digitalTwin: DigitalTwin;
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>;
  dispatch: ReturnType<typeof useDispatch>;
}

const MAX_EXECUTION_TIME = 10 * 60 * 1000;
export const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const hasTimedOut = (startTime: number) =>
  Date.now() - startTime > MAX_EXECUTION_TIME;

export const handleTimeout = (
  DTName: string,
  setButtonText: Dispatch<SetStateAction<string>>,
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  dispatch(
    showSnackbar({
      message: `Execution timed out for ${formatName(DTName)}`,
      severity: 'error',
    }),
  );
  setButtonText('Start');
  setLogButtonDisabled(false);
};

export const startPipelineStatusCheck = (params: PipelineStatusParams) => {
  const startTime = Date.now();
  checkFirstPipelineStatus({ ...params, startTime });
};

export const checkFirstPipelineStatus = async ({
  setButtonText,
  digitalTwin,
  setLogButtonDisabled,
  dispatch,
  startTime,
}: PipelineStatusParams & {
  startTime: number;
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
      dispatch,
    );
  } else {
    await delay(5000);
    checkFirstPipelineStatus({
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
      startTime,
    });
  }
};

export const handlePipelineCompletion = async (
  pipelineId: number,
  digitalTwin: DigitalTwin,
  setButtonText: Dispatch<SetStateAction<string>>,
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>,
  dispatch: ReturnType<typeof useDispatch>,
  pipelineStatus: 'success' | 'failed',
) => {
  const jobLogs = await fetchJobLogs(digitalTwin.gitlabInstance, pipelineId);
  updatePipelineStateOnCompletion(
    digitalTwin,
    jobLogs,
    setButtonText,
    setLogButtonDisabled,
    dispatch,
  );
  if (pipelineStatus === 'failed') {
    dispatch(
      showSnackbar({
        message: `Execution failed for ${formatName(digitalTwin.DTName)}`,
        severity: 'error',
      }),
    );
  }
};

export const checkSecondPipelineStatus = async ({
  setButtonText,
  digitalTwin,
  setLogButtonDisabled,
  dispatch,
  startTime,
}: PipelineStatusParams & {
  startTime: number;
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
      pipelineStatus,
    );
  } else if (hasTimedOut(startTime)) {
    handleTimeout(
      digitalTwin.DTName,
      setButtonText,
      setLogButtonDisabled,
      dispatch,
    );
  } else {
    await delay(5000);
    await checkSecondPipelineStatus({
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
      startTime,
    });
  }
};
