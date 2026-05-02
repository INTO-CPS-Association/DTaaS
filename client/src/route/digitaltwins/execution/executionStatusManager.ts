import { Dispatch, SetStateAction } from 'react';
import { useDispatch } from 'react-redux';
import DigitalTwin, { formatName } from 'model/backend/digitalTwin';
import indexedDBService from 'database/executionHistoryDB';
import { showSnackbar } from 'store/snackbar.slice';
import { updateExecutionStatus } from 'model/backend/state/executionHistory.slice';
import {
  setPipelineCompleted,
  setPipelineLoading,
} from 'model/backend/state/digitalTwin.slice';
import {
  delay,
  hasTimedOut,
} from 'model/backend/gitlab/execution/pipelineCore';
import { fetchJobLogs } from 'model/backend/gitlab/execution/logFetching';
import { PIPELINE_POLL_INTERVAL } from 'model/backend/gitlab/digitalTwinConfig/constants';
import { ExecutionStatus } from 'model/backend/interfaces/execution';
import {
  updatePipelineStateOnCompletion,
  fetchLogsAndUpdateExecution,
} from 'route/digitaltwins/execution/executionStatusHandlers';

export interface PipelineStatusParams {
  setButtonText: Dispatch<SetStateAction<string>>;
  digitalTwin: DigitalTwin;
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>;
  dispatch: ReturnType<typeof useDispatch>;
  executionId?: string;
}

/**
 * Handles execution timeout with UI feedback
 * @param DTName Digital twin name
 * @param setButtonText React state setter for button text
 * @param setLogButtonDisabled React state setter for log button
 * @param dispatch Redux dispatch function
 * @param executionId Optional execution ID
 */
export const handleTimeout = async (
  DTName: string,
  setButtonText: Dispatch<SetStateAction<string>>,
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>,
  dispatch: ReturnType<typeof useDispatch>,
  executionId?: string,
) => {
  dispatch(
    showSnackbar({
      message: `Execution timed out for ${formatName(DTName)}`,
      severity: 'error',
    }),
  );

  if (executionId) {
    const execution = await indexedDBService.getById(executionId);
    if (execution) {
      execution.status = ExecutionStatus.TIMEOUT;
      await Promise.resolve(indexedDBService.update(execution));
    }

    dispatch(
      updateExecutionStatus({
        id: executionId,
        status: ExecutionStatus.TIMEOUT,
      }),
    );
  }

  setButtonText('Start');
  setLogButtonDisabled(false);
};

/**
 * Starts pipeline status checking process
 * @param params Pipeline status parameters
 */
export const startPipelineStatusCheck = async (
  params: PipelineStatusParams,
) => {
  const startTime = Date.now();
  await checkParentPipelineStatus({ ...params, startTime });
};

/**
 * Checks parent pipeline status and handles transitions
 * @param params Pipeline status parameters with start time
 */
export const checkParentPipelineStatus = async ({
  setButtonText,
  digitalTwin,
  setLogButtonDisabled,
  dispatch,
  startTime,
  executionId,
}: PipelineStatusParams & {
  startTime: number;
}) => {
  const pipelineId = executionId
    ? (await digitalTwin.getExecutionHistoryById(executionId))?.pipelineId ||
      digitalTwin.pipelineId!
    : digitalTwin.pipelineId!;

  const pipelineStatus = await digitalTwin.backend.getPipelineStatus(
    digitalTwin.backend.getProjectId(),
    pipelineId,
  );

  if (pipelineStatus === 'success' || pipelineStatus === 'failed') {
    await checkChildPipelineStatus({
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
      startTime,
      executionId,
    });
  } else if (hasTimedOut(startTime)) {
    await handleTimeout(
      digitalTwin.DTName,
      setButtonText,
      setLogButtonDisabled,
      dispatch,
      executionId,
    );
  } else {
    await delay(PIPELINE_POLL_INTERVAL);
    await checkParentPipelineStatus({
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
      startTime,
      executionId,
    });
  }
};

/**
 * Handles pipeline completion with UI feedback
 * @param pipelineId Pipeline ID that completed
 * @param digitalTwin Digital twin instance
 * @param setButtonText React state setter for button text
 * @param setLogButtonDisabled React state setter for log button
 * @param dispatch Redux dispatch function
 * @param pipelineStatus Pipeline completion status
 * @param executionId Optional execution ID
 */
export const handlePipelineCompletion = async (
  pipelineId: number,
  digitalTwin: DigitalTwin,
  setButtonText: Dispatch<SetStateAction<string>>,
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>,
  dispatch: ReturnType<typeof useDispatch>,
  pipelineStatus: 'success' | 'failed',
  executionId?: string,
) => {
  const status =
    pipelineStatus === 'success'
      ? ExecutionStatus.COMPLETED
      : ExecutionStatus.FAILED;

  if (executionId) {
    const logsUpdated = await fetchLogsAndUpdateExecution(
      digitalTwin,
      pipelineId,
      executionId,
      status,
      dispatch,
    );

    if (!logsUpdated) {
      await digitalTwin.updateExecutionStatus(executionId, status);
      dispatch(
        updateExecutionStatus({
          id: executionId,
          status,
        }),
      );
    }

    setButtonText('Start');
    setLogButtonDisabled(false);

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
  } else {
    const jobLogs = await fetchJobLogs(digitalTwin.backend, pipelineId);
    await updatePipelineStateOnCompletion(
      digitalTwin,
      jobLogs,
      setButtonText,
      setLogButtonDisabled,
      dispatch,
      undefined,
      status,
    );
  }

  if (pipelineStatus === 'failed') {
    dispatch(
      showSnackbar({
        message: `Execution failed for ${formatName(digitalTwin.DTName)}`,
        severity: 'error',
      }),
    );
  } else {
    dispatch(
      showSnackbar({
        message: `Execution completed successfully for ${formatName(digitalTwin.DTName)}`,
        severity: 'success',
      }),
    );
  }
};

/**
 * Checks child pipeline status and handles completion
 * @param params Pipeline status parameters with start time
 */
export const checkChildPipelineStatus = async ({
  setButtonText,
  digitalTwin,
  setLogButtonDisabled,
  dispatch,
  startTime,
  executionId,
}: PipelineStatusParams & {
  startTime: number;
}) => {
  let pipelineId: number;

  if (executionId) {
    const execution = await digitalTwin.getExecutionHistoryById(executionId);
    pipelineId = execution
      ? execution.pipelineId + 1
      : digitalTwin.pipelineId! + 1;
  } else {
    pipelineId = digitalTwin.pipelineId! + 1;
  }

  const pipelineStatus = await digitalTwin.backend.getPipelineStatus(
    digitalTwin.backend.getProjectId(),
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
      executionId,
    );
  } else if (hasTimedOut(startTime)) {
    await handleTimeout(
      digitalTwin.DTName,
      setButtonText,
      setLogButtonDisabled,
      dispatch,
      executionId,
    );
  } else {
    await delay(PIPELINE_POLL_INTERVAL);
    await checkChildPipelineStatus({
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
      startTime,
      executionId,
    });
  }
};
