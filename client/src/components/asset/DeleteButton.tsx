import { Dispatch, SetStateAction } from 'react';
import { Button } from '@mui/material';

interface DeleteButtonProps {
  readonly setShowDelete: Dispatch<React.SetStateAction<boolean>>;
}

const handleToggleDeleteDialog = (
  setShowDelete: Dispatch<SetStateAction<boolean>>,
) => {
  setShowDelete(true);
};

function DeleteButton({ setShowDelete }: DeleteButtonProps) {
  return (
    <Button
      variant="contained"
      size="small"
      color="primary"
      onClick={() => handleToggleDeleteDialog(setShowDelete)}
      data-logger-element="button"
      data-logger-label="Delete"
    >
      Delete
    </Button>
  );
}

export default DeleteButton;
