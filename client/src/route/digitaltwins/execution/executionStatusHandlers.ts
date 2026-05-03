import { Dispatch, SetStateAction } from 'react';
import { useDispatch } from 'react-redux';
import DigitalTwin, { formatName } from 'model/backend/digitalTwin';
import {
  setJobLogs,
  setPipelineCompleted,
  setPipelineLoading,
} from 'model/backend/state/digitalTwin.slice';
import { JobLog } from 'model/backend/gitlab/types/executionHistory';
import {
  updateExecutionLogs,
  updateExecutionStatus,
  setSelectedExecutionId,
} from 'model/backend/state/executionHistory.slice';
import { fetchJobLogs } from 'model/backend/gitlab/execution/logFetching';
import { ExecutionStatus } from 'model/backend/interfaces/execution';
import { ShowNotificationPayload } from 'model/backend/interfaces/sharedInterfaces';

// Re-export for test compatibility
export { fetchJobLogs } from 'model/backend/gitlab/execution/logFetching';

/**
 * Starts a digital twin pipeline execution with UI feedback
 * @param digitalTwin Digital twin instance
 * @param dispatch Redux dispatch function
 * @param setLogButtonDisabled React state setter for log button
 * @returns Execution ID if successful, null otherwise
 */
export const startPipeline = async (
  digitalTwin: DigitalTwin,
  dispatch: ReturnType<typeof useDispatch>,
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>,
): Promise<string | null> => {
  const pipelineId = await digitalTwin.execute();

  if (!pipelineId || !digitalTwin.currentExecutionId) {
    const executionStatusMessage = `Execution ${digitalTwin.lastExecutionStatus} for ${formatName(digitalTwin.DTName)}`;
    dispatch({
      type: 'snackbar/showSnackbar',
      payload: {
        message: executionStatusMessage,
        severity: 'error',
      } as ShowNotificationPayload,
    });
    return null;
  }

  const executionStatusMessage = `Execution started successfully for ${formatName(digitalTwin.DTName)}. Wait until completion for the logs...`;
  dispatch({
    type: 'snackbar/showSnackbar',
    payload: {
      message: executionStatusMessage,
      severity: 'success',
      icon: 'PlayArrowIcon',
    } as ShowNotificationPayload,
  });

  dispatch(setSelectedExecutionId(digitalTwin.currentExecutionId));
  setLogButtonDisabled(false);

  return digitalTwin.currentExecutionId;
};

/**
 * Updates pipeline state when execution starts
 * @param digitalTwin Digital twin instance
 * @param dispatch Redux dispatch function
 * @param executionId Optional execution ID for concurrent executions
 */
export const updatePipelineState = (
  digitalTwin: DigitalTwin,
  dispatch: ReturnType<typeof useDispatch>,
  executionId?: string,
) => {
  // For backward compatibility
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

  if (executionId) {
    dispatch(
      updateExecutionStatus({
        id: executionId,
        status: ExecutionStatus.RUNNING,
      }),
    );
  }
};

/**
 * Updates pipeline state when execution completes
 * @param digitalTwin Digital twin instance
 * @param jobLogs Job logs from the execution
 * @param setButtonText React state setter for button text
 * @param _setLogButtonDisabled React state setter for log button (unused)
 * @param dispatch Redux dispatch function
 * @param executionId Optional execution ID for concurrent executions
 * @param status Execution status
 */
export const updatePipelineStateOnCompletion = async (
  digitalTwin: DigitalTwin,
  jobLogs: JobLog[],
  setButtonText: Dispatch<SetStateAction<string>>,
  _setLogButtonDisabled: Dispatch<SetStateAction<boolean>>,
  dispatch: ReturnType<typeof useDispatch>,
  executionId?: string,
  status: ExecutionStatus = ExecutionStatus.COMPLETED,
) => {
  // For backward compatibility
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

  if (executionId) {
    await digitalTwin.updateExecutionLogs(executionId, jobLogs);
    await digitalTwin.updateExecutionStatus(executionId, status);

    dispatch(
      updateExecutionLogs({
        id: executionId,
        logs: jobLogs,
      }),
    );
    dispatch(
      updateExecutionStatus({
        id: executionId,
        status,
      }),
    );
  }

  setButtonText('Start');
};

/**
 * Updates pipeline state when execution is stopped
 * @param digitalTwin Digital twin instance
 * @param setButtonText React state setter for button text
 * @param dispatch Redux dispatch function
 * @param executionId Optional execution ID for concurrent executions
 */
export const updatePipelineStateOnStop = (
  digitalTwin: DigitalTwin,
  setButtonText: Dispatch<SetStateAction<string>>,
  dispatch: ReturnType<typeof useDispatch>,
  executionId?: string,
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

  if (executionId) {
    dispatch(
      updateExecutionStatus({
        id: executionId,
        status: ExecutionStatus.CANCELED,
      }),
    );

    digitalTwin.updateExecutionStatus(executionId, ExecutionStatus.CANCELED);
  }
};

/**
 * Fetches logs and updates execution with UI feedback
 * @param digitalTwin Digital twin instance
 * @param pipelineId Pipeline ID to fetch logs for
 * @param executionId Execution ID to update
 * @param status Execution status to set
 * @param dispatch Redux dispatch function
 * @returns True if logs were successfully fetched and updated
 */
export const fetchLogsAndUpdateExecution = async (
  digitalTwin: DigitalTwin,
  pipelineId: number,
  executionId: string,
  status: ExecutionStatus,
  dispatch: ReturnType<typeof useDispatch>,
): Promise<boolean> => {
  try {
    const jobLogs = await fetchJobLogs(digitalTwin.backend, pipelineId);

    if (jobLogs.every((log) => !log.log || log.log.trim() === '')) {
      return false;
    }

    await digitalTwin.updateExecutionLogs(executionId, jobLogs);
    await digitalTwin.updateExecutionStatus(executionId, status);

    dispatch(
      updateExecutionLogs({
        id: executionId,
        logs: jobLogs,
      }),
    );

    dispatch(
      updateExecutionStatus({
        id: executionId,
        status,
      }),
    );

    return true;
  } catch {
    return false;
  }
};
