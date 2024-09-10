import * as React from 'react';
import { useState, Dispatch, SetStateAction } from 'react';
import { AlertColor, Button, CircularProgress } from '@mui/material';
import { handleButtonClick } from 'route/digitaltwins/ExecutionFunctions';
import { useSelector, useDispatch } from 'react-redux';
import { selectDigitalTwinByName } from 'store/digitalTwin.slice';

export interface JobLog {
  jobName: string;
  log: string;
}

interface StartStopButtonProps {
  assetName: string;
  setSnackbarOpen: Dispatch<SetStateAction<boolean>>;
  setSnackbarMessage: Dispatch<SetStateAction<string>>;
  setSnackbarSeverity: Dispatch<SetStateAction<AlertColor>>;
  setLogButtonDisabled: Dispatch<SetStateAction<boolean>>;
}

function StartStopButton({
  assetName,
  setSnackbarOpen,
  setSnackbarMessage,
  setSnackbarSeverity,
  setLogButtonDisabled,
}: StartStopButtonProps) {
  const [buttonText, setButtonText] = useState('Start');

  const dispatch = useDispatch();
  const digitalTwin = useSelector(selectDigitalTwinByName(assetName));

  return (
    <>
      {digitalTwin?.pipelineLoading ? (
        <CircularProgress
          size={22}
          style={{ marginRight: '8px' }}
          data-testid="circular-progress"
        />
      ) : null}{' '}
      <Button
        variant="contained"
        size="small"
        color="primary"
        onClick={() =>
          handleButtonClick(
            buttonText,
            setButtonText,
            digitalTwin,
            setSnackbarMessage,
            setSnackbarSeverity,
            setSnackbarOpen,
            setLogButtonDisabled,
            dispatch,
          )
        }
      >
        {buttonText}
      </Button>
    </>
  );
}

export default StartStopButton;
