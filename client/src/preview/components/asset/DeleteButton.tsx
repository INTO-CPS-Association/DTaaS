import * as React from 'react';
import { Dispatch, SetStateAction } from 'react';
import { Button } from '@mui/material';

interface DeleteButtonProps {
  setShowLog: Dispatch<React.SetStateAction<boolean>>;
}

const handleToggleLog = (setShowLog: Dispatch<SetStateAction<boolean>>) => {
  setShowLog(true);
};

function DeleteButton({ setShowLog }: DeleteButtonProps) {
  return (
    <Button
      variant="contained"
      size="small"
      color="primary"
      onClick={() => handleToggleLog(setShowLog)}
    >
      Delete
    </Button>
  );
}

export default DeleteButton;
