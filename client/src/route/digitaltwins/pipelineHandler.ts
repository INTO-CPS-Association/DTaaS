import { Dispatch, SetStateAction } from 'react';
import { AlertColor } from '@mui/material';
import DigitalTwin, { formatName } from 'util/gitlabDigitalTwin';
import { useDispatch } from 'react-redux';
import {
  startPipeline,
  updatePipelineState,
  updatePipelineStateOnStop,
} from './pipelineUtils';
import startPipelineStatusCheck from './pipelineChecks';

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
    updatePipelineState(digitalTwin, dispatch);
    await startPipeline(
      digitalTwin,
      setSnackbarMessage,
      setSnackbarSeverity,
      setSnackbarOpen,
    );
    const params = {
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
      setSnackbarMessage,
      setSnackbarSeverity,
      setSnackbarOpen,
    };
    startPipelineStatusCheck(params);
  } else {
    setButtonText('Start');
  }
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
      `Execution stopped successfully for ${formatName(digitalTwin.DTName)}`,
      'success',
      setSnackbarMessage,
      setSnackbarSeverity,
      setSnackbarOpen,
    );
  } catch (error) {
    setSnackbar(
      `Execution stop failed for ${digitalTwin.DTName})`,
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

export const setSnackbar = (
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
