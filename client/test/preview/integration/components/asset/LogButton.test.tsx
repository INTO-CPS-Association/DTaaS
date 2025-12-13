import { screen, render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import HistoryButton from 'components/asset/HistoryButton';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import executionHistoryReducer from 'model/backend/state/executionHistory.slice';
import { ExecutionStatus } from 'model/backend/interfaces/execution';
import { dispatchAddExecHistoryEntry } from 'test/preview/integration/integration.testUtil';

const createTestStore = () =>
  configureStore({
    reducer: combineReducers({
      executionHistory: executionHistoryReducer,
    }),
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  });

describe('LogButton Integration Test', () => {
  const assetName = 'test-asset';
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  const renderLogButton = (
    setShowLog: jest.Mock = jest.fn(),
    historyButtonDisabled = false,
    testAssetName = assetName,
  ) =>
    act(() => {
      render(
        <Provider store={store}>
          <HistoryButton
            setShowLog={setShowLog}
            historyButtonDisabled={historyButtonDisabled}
            assetName={testAssetName}
          />
        </Provider>,
      );
    });

  it('renders the History button', () => {
    renderLogButton();
    expect(
      screen.getByRole('button', { name: /History/i }),
    ).toBeInTheDocument();
  });

  const clickLogButton = () => {
    const logButton = screen.getByRole('button', { name: /History/i });
    act(() => {
      fireEvent.click(logButton);
    });
  };
  it('handles button click when enabled', () => {
    renderLogButton();
    clickLogButton();
    expect(screen.getByRole('button', { name: /History/i })).toBeEnabled();
  });

  it('does not handle button click when disabled and no executions', () => {
    renderLogButton(jest.fn(), true);
    expect(screen.getByRole('button', { name: /History/i })).toBeDisabled();
  });

  it('toggles setShowLog value correctly', () => {
    let toggleValue = false;
    const mockSetShowLog = jest.fn((callback) => {
      toggleValue = callback(toggleValue);
    });
    renderLogButton(mockSetShowLog);
    clickLogButton();
    expect(toggleValue).toBe(true);
    clickLogButton();
    expect(toggleValue).toBe(false);
  });

  it('shows badge with execution count when executions exist', async () => {
    await dispatchAddExecHistoryEntry(store, {});
    await dispatchAddExecHistoryEntry(store, {
      id: '2',
      pipelineId: 456,
      status: ExecutionStatus.RUNNING,
    });
    renderLogButton();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('enables button when historyButtonDisabled is true but executions exist', async () => {
    await dispatchAddExecHistoryEntry(store, {});
    renderLogButton(jest.fn(), true);
    const logButton = screen.getByRole('button', { name: /History/i });
    expect(logButton).toBeEnabled();
  });
});
