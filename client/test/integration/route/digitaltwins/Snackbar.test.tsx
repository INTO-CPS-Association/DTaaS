import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CustomSnackbar from 'components/route/Snackbar';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import snackbarReducer, { showSnackbar } from 'store/snackbar.slice';

jest.useFakeTimers();

const createStore = () =>
  configureStore({
    reducer: combineReducers({
      snackbar: snackbarReducer,
    }),
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  });

function renderSnackbar(store: ReturnType<typeof createStore>) {
  act(() => {
    render(
      <Provider store={store}>
        <CustomSnackbar />
      </Provider>,
    );
  });
}

describe('CustomSnackbar Integration Test', () => {
  it('renders the Snackbar with the correct message', async () => {
    const store = createStore();
    store.dispatch(
      showSnackbar({ message: 'test message', severity: 'success' }),
    );

    renderSnackbar(store);

    expect(screen.getByText('test message')).toBeInTheDocument();
  });

  it('handles the close event', async () => {
    const store = createStore();
    store.dispatch(
      showSnackbar({ message: 'test message', severity: 'success' }),
    );

    renderSnackbar(store);

    act(() => {
      jest.advanceTimersByTime(6000);
    });
    const state = store.getState();
    expect(state.snackbar.items).toHaveLength(0);
  });

  it('stacks up to 3 snackbars', () => {
    const store = createStore();

    store.dispatch(showSnackbar({ message: 'First', severity: 'success' }));
    store.dispatch(showSnackbar({ message: 'Second', severity: 'error' }));
    store.dispatch(showSnackbar({ message: 'Third', severity: 'warning' }));

    renderSnackbar(store);

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('Third')).toBeInTheDocument();
    expect(store.getState().snackbar.items).toHaveLength(3);
  });

  it('drops oldest when exceeding 3 snackbars', () => {
    const store = createStore();

    store.dispatch(showSnackbar({ message: 'First', severity: 'success' }));
    store.dispatch(showSnackbar({ message: 'Second', severity: 'error' }));
    store.dispatch(showSnackbar({ message: 'Third', severity: 'warning' }));
    store.dispatch(showSnackbar({ message: 'Fourth', severity: 'info' }));

    renderSnackbar(store);

    expect(screen.queryByText('First')).not.toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('Third')).toBeInTheDocument();
    expect(screen.getByText('Fourth')).toBeInTheDocument();
    expect(store.getState().snackbar.items).toHaveLength(3);
  });
});
