import * as React from 'react';
import { act, render, screen } from '@testing-library/react';
import CustomSnackbar from 'preview/route/digitaltwins/Snackbar';
import { Provider, useSelector, useDispatch } from 'react-redux';
import store from 'store/store';
import { hideSnackbar } from 'preview/store/snackbar.slice';

jest.useFakeTimers();

describe('CustomSnackbar', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Snackbar with the correct message', () => {
    (useSelector as jest.Mock).mockReturnValue({
      open: true,
      message: 'test message',
      severity: 'success',
    });

    render(
      <Provider store={store}>
        <CustomSnackbar />
      </Provider>,
    );

    expect(screen.getByText('test message')).toBeInTheDocument();
  });

  it('handles the close event', () => {
    (useSelector as jest.Mock).mockReturnValue({
      open: true,
      message: 'test message',
      severity: 'success',
    });

    const mockDispatch = jest.fn();
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);

    render(
      <Provider store={store}>
        <CustomSnackbar />
      </Provider>,
    );

    act(() => {
      jest.advanceTimersByTime(6000);
    });

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(hideSnackbar());
  });

  it('calls useSelector with correct function', () => {
    const mockSnackbarState = {
      open: true,
      message: 'test message',
      severity: 'success',
    };
    (useSelector as jest.Mock).mockReturnValue(mockSnackbarState);

    render(
      <Provider store={store}>
        <CustomSnackbar />
      </Provider>,
    );

    expect(useSelector).toHaveBeenCalledWith(expect.any(Function));

    const selectState = (useSelector as jest.Mock).mock.calls[0][0];
    const result = selectState({ snackbar: mockSnackbarState });
    expect(result).toEqual(mockSnackbarState);
  });
});
