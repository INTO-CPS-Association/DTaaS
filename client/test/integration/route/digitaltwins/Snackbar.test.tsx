import { act, render, screen } from '@testing-library/react';
import CustomSnackbar from 'components/route/Snackbar';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import snackbarReducer, { showSnackbar } from 'store/snackbar.slice';

jest.useFakeTimers();

const store = configureStore({
  reducer: combineReducers({
    snackbar: snackbarReducer,
  }),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

describe('CustomSnackbar Integration Test', () => {
  it('renders the Snackbar with the correct message', async () => {
    store.dispatch(
      showSnackbar({
        message: 'test message',
        severity: 'success',
      }),
    );

    act(() => {
      render(
        <Provider store={store}>
          <CustomSnackbar />
        </Provider>,
      );
    });

    expect(screen.getByText('test message')).toBeInTheDocument();
  });

  it('handles the close event', async () => {
    store.dispatch(
      showSnackbar({
        message: 'test message',
        severity: 'success',
      }),
    );

    act(() => {
      render(
        <Provider store={store}>
          <CustomSnackbar />
        </Provider>,
      );
    });

    act(() => {
      jest.advanceTimersByTime(6000);
    });
    const state = store.getState();
    expect(state.snackbar.open).toBe(false);
  });
});
