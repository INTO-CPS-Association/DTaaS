import { Dispatch, SetStateAction } from 'react';
import { Button } from '@mui/material';

interface DeleteButtonProps {
  setShowDelete: Dispatch<React.SetStateAction<boolean>>;
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
    >
      Delete
    </Button>
  );
}

export default DeleteButton;
