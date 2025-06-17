import { Dispatch, SetStateAction } from 'react';
import { useDispatch } from 'react-redux';
import DigitalTwin, { formatName } from 'preview/util/digitalTwin';
import {
  fetchJobLogs,
  updatePipelineStateOnCompletion,
} from 'preview/route/digitaltwins/execute/pipelineUtils';
import { showSnackbar } from 'preview/store/snackbar.slice';
import {
  delay,
  hasTimedOut,
  getPollingInterval,
} from 'model/backend/gitlab/execution/pipelineCore';
import {
  isSuccessStatus,
  isFailureStatus,
} from 'model/backend/gitlab/execution/statusChecking';

interface PipelineStatusParams {
  setButtonText: Dispatch<SetStateAction<string>>;
  digitalTwin: DigitalTwin;
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>;
  dispatch: ReturnType<typeof useDispatch>;
}

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
  checkParentPipelineStatus({ ...params, startTime });
};

export const checkParentPipelineStatus = async ({
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

  if (isSuccessStatus(pipelineStatus)) {
    await checkChildPipelineStatus({
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
      startTime,
    });
  } else if (isFailureStatus(pipelineStatus)) {
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
    await delay(getPollingInterval());
    await checkParentPipelineStatus({
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

export const checkChildPipelineStatus = async ({
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

  if (isSuccessStatus(pipelineStatus) || isFailureStatus(pipelineStatus)) {
    const statusForCompletion = isSuccessStatus(pipelineStatus)
      ? 'success'
      : 'failed';
    await handlePipelineCompletion(
      pipelineId,
      digitalTwin,
      setButtonText,
      setLogButtonDisabled,
      dispatch,
      statusForCompletion,
    );
  } else if (hasTimedOut(startTime)) {
    handleTimeout(
      digitalTwin.DTName,
      setButtonText,
      setLogButtonDisabled,
      dispatch,
    );
  } else {
    await delay(getPollingInterval());
    await checkChildPipelineStatus({
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
      startTime,
    });
  }
};
