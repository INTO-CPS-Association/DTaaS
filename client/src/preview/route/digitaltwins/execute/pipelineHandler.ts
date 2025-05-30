import { Dispatch, SetStateAction } from 'react';
import DigitalTwin, { formatName } from 'preview/util/digitalTwin';
import { useDispatch } from 'react-redux';
import { showSnackbar } from 'preview/store/snackbar.slice';
import {
  startPipeline,
  updatePipelineState,
  updatePipelineStateOnStop,
} from './pipelineUtils';
import { startPipelineStatusCheck } from './pipelineChecks';

export const handleButtonClick = (
  buttonText: string,
  setButtonText: Dispatch<SetStateAction<string>>,
  digitalTwin: DigitalTwin,
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  if (buttonText === 'Start') {
    handleStart(
      buttonText,
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
    );
  } else {
    handleStop(digitalTwin, setButtonText, dispatch);
  }
};

export const handleStart = async (
  buttonText: string,
  setButtonText: Dispatch<SetStateAction<string>>,
  digitalTwin: DigitalTwin,
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  if (buttonText === 'Start') {
    setButtonText('Stop');
    setLogButtonDisabled(true);
    updatePipelineState(digitalTwin, dispatch);
    await startPipeline(digitalTwin, dispatch, setLogButtonDisabled);
    const params = {
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
    };
    startPipelineStatusCheck(params);
  } else {
    setButtonText('Start');
  }
};

export const handleStop = async (
  digitalTwin: DigitalTwin,
  setButtonText: Dispatch<SetStateAction<string>>,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  try {
    await stopPipelines(digitalTwin);
    dispatch(
      showSnackbar({
        message: `Execution stopped successfully for ${formatName(
          digitalTwin.DTName,
        )}`,
        severity: 'success',
      }),
    );
  } catch (_error) {
    dispatch(
      showSnackbar({
        message: `Execution stop failed for ${formatName(digitalTwin.DTName)}`,
        severity: 'error',
      }),
    );
  } finally {
    updatePipelineStateOnStop(digitalTwin, setButtonText, dispatch);
  }
};

export const stopPipelines = async (digitalTwin: DigitalTwin) => {
  if (digitalTwin.backend.getProjectId() && digitalTwin.pipelineId) {
    await digitalTwin.stop(
      digitalTwin.backend.getProjectId(),
      'parentPipeline',
    );
    await digitalTwin.stop(digitalTwin.backend.getProjectId(), 'childPipeline');
  }
};
