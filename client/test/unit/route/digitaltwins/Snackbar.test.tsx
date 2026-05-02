import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CustomSnackbar from 'components/route/Snackbar';
import { Provider, useDispatch, useSelector } from 'react-redux';
import store from 'store/store';
import { hideSnackbar } from 'store/snackbar.slice';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.useFakeTimers();

describe('CustomSnackbar', () => {
  let mockDispatch: jest.Mock;

  beforeEach(() => {
    mockDispatch = jest.fn();
    (useDispatch as jest.MockedFunction<typeof useDispatch>).mockReturnValue(
      mockDispatch,
    );
  });

  it('renders the Snackbar with the correct message', () => {
    (useSelector as jest.MockedFunction<typeof useSelector>).mockReturnValue([
      { id: 0, message: 'test message', severity: 'success' },
    ]);

    render(
      <Provider store={store}>
        <CustomSnackbar />
      </Provider>,
    );

    expect(screen.getByText('test message')).toBeInTheDocument();
  });

  it('handles the close event', () => {
    (useSelector as jest.MockedFunction<typeof useSelector>).mockReturnValue([
      { id: 0, message: 'test message', severity: 'success' },
    ]);

    render(
      <Provider store={store}>
        <CustomSnackbar />
      </Provider>,
    );

    act(() => {
      jest.advanceTimersByTime(6000);
    });

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(hideSnackbar(0));
  });

  it('calls useSelector with correct function', () => {
    const mockItems = [{ id: 0, message: 'test message', severity: 'success' }];
    (useSelector as jest.MockedFunction<typeof useSelector>).mockReturnValue(
      mockItems,
    );

    render(
      <Provider store={store}>
        <CustomSnackbar />
      </Provider>,
    );

    expect(useSelector).toHaveBeenCalledWith(expect.any(Function));

    const selectState = (useSelector as jest.MockedFunction<typeof useSelector>)
      .mock.calls[0][0];
    const result = selectState({ snackbar: { items: mockItems, nextId: 1 } });
    expect(result).toEqual(mockItems);
  });
});
