import snackbarSlice, {
  hideSnackbar,
  showSnackbar,
} from 'store/snackbar.slice';
import { AlertColor } from '@mui/material';

describe('snackbar reducer', () => {
  const initialSnackbarState = {
    open: false,
    message: '',
    severity: 'info' as AlertColor,
  };

  it('should handle showSnackbar', () => {
    const message = 'message';
    const severity: AlertColor = 'error';
    const newState = snackbarSlice(
      initialSnackbarState,
      showSnackbar({ message, severity }),
    );
    expect(newState.open).toBe(true);
    expect(newState.message).toBe(message);
    expect(newState.severity).toBe(severity);
  });

  it('should handle hideSnackbar', () => {
    const openState = {
      open: true,
      message: 'message',
      severity: 'error' as AlertColor,
    };
    const newState = snackbarSlice(openState, hideSnackbar());
    expect(newState.open).toBe(false);
  });
});
