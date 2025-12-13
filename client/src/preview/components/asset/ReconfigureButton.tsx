import { Button } from '@mui/material';
import { Dispatch, SetStateAction } from 'react';

interface ReconfigureButtonProps {
  setShowReconfigure: Dispatch<SetStateAction<boolean>>;
}

export const handleToggleReconfigureDialog = (
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
      onClick={() => handleToggleReconfigureDialog(setShowReconfigure)}
    >
      Reconfigure
    </Button>
  );
}

export default ReconfigureButton;
