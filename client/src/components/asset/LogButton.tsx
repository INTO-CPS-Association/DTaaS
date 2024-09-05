import * as React from 'react';
import { Dispatch, SetStateAction } from 'react';
import { Button } from '@mui/material';

interface LogButtonProps {
  pipelineCompleted: boolean;
  setShowLog: Dispatch<React.SetStateAction<boolean>>;
}

const handleToggleLog = (setShowLog: Dispatch<SetStateAction<boolean>>) => {
  setShowLog((prev) => !prev);
};

function LogButton({ pipelineCompleted, setShowLog }: LogButtonProps) {
  return (
    <Button
      variant="contained"
      size="small"
      color="primary"
      onClick={() => handleToggleLog(setShowLog)}
      disabled={!pipelineCompleted}
    >
      Log
    </Button>
  );
}

export default LogButton;
