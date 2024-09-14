import * as React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import CustomSnackbar from 'preview/route/digitaltwins/Snackbar'; // Adjust the import path accordingly

describe('CustomSnackbar', () => {
  it('renders the snackbar with the correct message and severity', () => {
    act(() => {
      render(
        <CustomSnackbar
          snackbarOpen={true}
          snackbarMessage="Test Message"
          snackbarSeverity="success"
          setSnackbarOpen={jest.fn()}
        />,
      );
    });

    expect(screen.getByText('Test Message')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-standardSuccess');
  });

  it('does not render the snackbar when snackbarOpen is false', () => {
    const { container } = render(
      <CustomSnackbar
        snackbarOpen={false}
        snackbarMessage="Test Message"
        snackbarSeverity="success"
        setSnackbarOpen={jest.fn()}
      />,
    );

    expect(container.querySelector('div')).toBeNull();
  });

  it('calls handleCloseSnackbar when the snackbar is closed through the alert button', () => {
    const setSnackbarOpen = jest.fn();
    act(() => {
      render(
        <CustomSnackbar
          snackbarOpen={true}
          snackbarMessage="Test Message"
          snackbarSeverity="error"
          setSnackbarOpen={setSnackbarOpen}
        />,
      );
    });

    fireEvent.click(screen.getByRole('button'));
    expect(setSnackbarOpen).toHaveBeenCalledWith(false);
  });

  it('calls handleCloseSnackbar when the snackbar is closed via auto-hide duration', () => {
    jest.useFakeTimers(); // Mock timers
    const setSnackbarOpen = jest.fn();
    act(() => {
      render(
        <CustomSnackbar
          snackbarOpen={true}
          snackbarMessage="Test Message"
          snackbarSeverity="warning"
          setSnackbarOpen={setSnackbarOpen}
        />,
      );
    });

    act(() => {
      jest.runAllTimers();
    });

    expect(setSnackbarOpen).toHaveBeenCalledWith(false);
    jest.useRealTimers();
  });
});
