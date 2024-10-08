import * as React from 'react';
import { Button } from '@mui/material';
import { Dispatch, SetStateAction } from 'react';

interface ReconfigureButtonProps {
  setShowReconfigure: Dispatch<SetStateAction<boolean>>;
}

const handleToggleReconfigure = (
  setShowReconfigure: Dispatch<SetStateAction<boolean>>,
) => {
  setShowReconfigure((prev) => !prev);
};

function ReconfigureButton({ setShowReconfigure }: ReconfigureButtonProps) {
  return (
    <Button
      variant="contained"
      size="small"
      color="primary"
      onClick={() => handleToggleReconfigure(setShowReconfigure)}
    >
      Reconfigure
    </Button>
  );
}

export default ReconfigureButton;
