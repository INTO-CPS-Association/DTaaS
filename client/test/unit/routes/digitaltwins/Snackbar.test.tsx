import * as React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import CustomSnackbar from 'route/digitaltwins/Snackbar';
import { Provider } from 'react-redux';
import { hideSnackbar } from 'store/snackbar.slice';

const mockStore = (initialState: any) => ({
  getState: () => initialState,
  dispatch: jest.fn(),
  subscribe: jest.fn(),
});

describe('CustomSnackbar', () => {
  it('renders the snackbar with the correct message and severity', () => {
    const store = mockStore({
      snackbar: {
        open: true,
        message: 'Test Message',
        severity: 'success',
      },
    });

    render(
      <Provider store={store as any}>
        <CustomSnackbar />
      </Provider>,
    );

    expect(screen.getByText('Test Message')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-standardSuccess');
  });

  it('does not render the snackbar when open is false', () => {
    const store = mockStore({
      snackbar: {
        open: false,
        message: 'Test Message',
        severity: 'success',
      },
    });

    render(
      <Provider store={store as any}>
        <CustomSnackbar />
      </Provider>,
    );

    expect(screen.queryByText('Test Message')).toBeNull();
  });

  it('dispatches hideSnackbar action when the snackbar is closed through the alert button', () => {
    const mockDispatch = jest.fn();
    const store = mockStore({
      snackbar: {
        open: true,
        message: 'Test Message',
        severity: 'error',
      },
    });

    (store.dispatch as jest.Mock) = mockDispatch;

    render(
      <Provider store={store as any}>
        <CustomSnackbar />
      </Provider>,
    );

    fireEvent.click(screen.getByRole('button'));
    expect(mockDispatch).toHaveBeenCalledWith(hideSnackbar());
  });

  it('dispatches hideSnackbar action when the snackbar is closed via auto-hide duration', () => {
    jest.useFakeTimers();

    const mockDispatch = jest.fn();
    const store = mockStore({
      snackbar: {
        open: true,
        message: 'Test Message',
        severity: 'warning',
      },
    });

    (store.dispatch as jest.Mock) = mockDispatch;

    render(
      <Provider store={store as any}>
        <CustomSnackbar />
      </Provider>,
    );

    act(() => {
      jest.runAllTimers();
    });

    expect(mockDispatch).toHaveBeenCalledWith(hideSnackbar());
    jest.useRealTimers();
  });
});
