import { Dispatch, SetStateAction } from 'react';
import { ThunkDispatch, Action } from '@reduxjs/toolkit';
import DigitalTwin, { formatName } from 'model/backend/digitalTwin';
import { fetchExecutionHistory } from 'model/backend/state/executionHistory.slice';
import type { RootState } from 'store/store';
import {
  startPipeline,
  updatePipelineState,
  updatePipelineStateOnStop,
} from 'route/digitaltwins/execution/executionStatusHandlers';
import { startPipelineStatusCheck } from 'route/digitaltwins/execution/executionStatusManager';
import { stopPipelines } from 'model/backend/gitlab/execution/pipelineCore';
import { ShowNotificationPayload } from 'model/backend/interfaces/sharedInterfaces';

export type PipelineHandlerDispatch = ThunkDispatch<
  RootState,
  unknown,
  Action<string>
>;

/**
 * Main handler for execution button clicks (Start/Stop)
 * @param buttonText Current button text ('Start' or 'Stop')
 * @param setButtonText React state setter for button text
 * @param digitalTwin Digital twin instance
 * @param setLogButtonDisabled React state setter for log button
 * @param dispatch Redux dispatch function
 */
export const handleButtonClick = async (
  buttonText: string,
  setButtonText: Dispatch<SetStateAction<string>>,
  digitalTwin: DigitalTwin,
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>,
  dispatch: PipelineHandlerDispatch,
) => {
  if (buttonText === 'Start') {
    await handleStart(
      buttonText,
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
    );
  } else {
    await handleStop(digitalTwin, setButtonText, dispatch);
  }
};

/**
 * Handles starting a digital twin execution
 * @param buttonText Current button text
 * @param setButtonText React state setter for button text
 * @param digitalTwin Digital twin instance
 * @param setLogButtonDisabled React state setter for log button
 * @param dispatch Redux dispatch function
 * @param executionId Optional execution ID for concurrent executions
 */
export const handleStart = async (
  buttonText: string,
  setButtonText: Dispatch<SetStateAction<string>>,
  digitalTwin: DigitalTwin,
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>,
  dispatch: PipelineHandlerDispatch,
  executionId?: string,
) => {
  if (buttonText === 'Start') {
    setButtonText('Stop');

    updatePipelineState(digitalTwin, dispatch);

    const newExecutionId = await startPipeline(
      digitalTwin,
      dispatch,
      setLogButtonDisabled,
    );

    if (newExecutionId) {
      dispatch(fetchExecutionHistory(digitalTwin.DTName));

      const params = {
        setButtonText,
        digitalTwin,
        setLogButtonDisabled,
        dispatch,
        executionId: newExecutionId,
      };
      startPipelineStatusCheck(params);
    }
  } else {
    setButtonText('Start');

    dispatch({
      type: 'snackbar/showSnackbar',
      payload: {
        message: `Stopping execution for ${formatName(digitalTwin.DTName)}...`,
        severity: 'warning',
      } as ShowNotificationPayload,
    });

    if (executionId) {
      await handleStop(digitalTwin, setButtonText, dispatch, executionId);
    } else {
      await handleStop(digitalTwin, setButtonText, dispatch);
    }
  }
};

/**
 * Handles stopping a digital twin execution
 * @param digitalTwin Digital twin instance
 * @param setButtonText React state setter for button text
 * @param dispatch Redux dispatch function
 * @param executionId Optional execution ID for concurrent executions
 */
export const handleStop = async (
  digitalTwin: DigitalTwin,
  setButtonText: Dispatch<SetStateAction<string>>,
  dispatch: PipelineHandlerDispatch,
  executionId?: string,
) => {
  const result = await stopPipelines(digitalTwin, executionId);

  if (result.success) {
    dispatch({
      type: 'snackbar/showSnackbar',
      payload: {
        message: `Execution stopped successfully for ${formatName(
          digitalTwin.DTName,
        )}`,
        severity: 'warning',
      } as ShowNotificationPayload,
    });
  } else {
    dispatch({
      type: 'snackbar/showSnackbar',
      payload: {
        message: `Execution stop failed for ${formatName(digitalTwin.DTName)}`,
        severity: 'error',
      } as ShowNotificationPayload,
    });
  }

  updatePipelineStateOnStop(digitalTwin, setButtonText, dispatch, executionId);
};
