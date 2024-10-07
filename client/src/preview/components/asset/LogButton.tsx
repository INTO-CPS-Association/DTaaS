import * as React from 'react';
import { Dispatch, SetStateAction } from 'react';
import { Button } from '@mui/material';

interface LogButtonProps {
  setShowLog: Dispatch<React.SetStateAction<boolean>>;
  logButtonDisabled: boolean;
}

export const handleToggleLog = (
  setShowLog: Dispatch<SetStateAction<boolean>>,
) => {
  setShowLog((prev) => !prev);
};

function LogButton({ setShowLog, logButtonDisabled }: LogButtonProps) {
  return (
    <Button
      variant="contained"
      size="small"
      color="primary"
      onClick={() => handleToggleLog(setShowLog)}
      disabled={logButtonDisabled}
    >
      Log
    </Button>
  );
}

export default LogButton;
