import React, { Dispatch, SetStateAction } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

interface CustomSnackbarProps {
  snackbarOpen: boolean;
  snackbarMessage: string;
  snackbarSeverity: 'success' | 'error' | 'warning' | 'info';
  setSnackbarOpen: Dispatch<SetStateAction<boolean>>;
}

const handleCloseSnackbar = (
  setSnackbarOpen: Dispatch<SetStateAction<boolean>>,
) => {
  setSnackbarOpen(false);
};

const CustomSnackbar: React.FC<CustomSnackbarProps> = ({
  snackbarOpen,
  snackbarMessage,
  snackbarSeverity,
  setSnackbarOpen,
}) => (
  <Snackbar
    open={snackbarOpen}
    autoHideDuration={6000}
    onClose={() => handleCloseSnackbar(setSnackbarOpen)}
  >
    <Alert
      onClose={() => handleCloseSnackbar(setSnackbarOpen)}
      severity={snackbarSeverity}
    >
      {snackbarMessage}
    </Alert>
  </Snackbar>
);

export default CustomSnackbar;
