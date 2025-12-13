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

describe('HistoryButton Integration Test', () => {
  const assetName = 'test-asset';
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  const renderHistoryButton = (
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

  const getHistoryButtonElement = () =>
    screen.getByRole('button', { name: /History/i });
  it('renders the History button', () => {
    renderHistoryButton();
    expect(
      screen.getByRole('button', { name: /History/i }),
    ).toBeInTheDocument();
  });

  it('handles button click when enabled', () => {
    const setShowLog = jest.fn((callback) => callback(false));
    renderHistoryButton(setShowLog);

    const historyButton = getHistoryButtonElement();
    act(() => {
      fireEvent.click(historyButton);
    });

    expect(setShowLog).toHaveBeenCalled();
  });

  it('does not handle button click when disabled and no executions', () => {
    renderHistoryButton(jest.fn(), true); // historyButtonDisabled = true

    const historyButton = getHistoryButtonElement();
    expect(historyButton).toBeDisabled();
  });

  it('toggles setShowLog value correctly', () => {
    let toggleValue = false;
    const mockSetShowLog = jest.fn((callback) => {
      toggleValue = callback(toggleValue);
    });

    renderHistoryButton(mockSetShowLog);
    const historyButton = getHistoryButtonElement();

    act(() => {
      fireEvent.click(historyButton);
    });
    expect(toggleValue).toBe(true);

    act(() => {
      fireEvent.click(historyButton);
    });
    expect(toggleValue).toBe(false);
  });

  it('shows badge with execution count when executions exist', async () => {
    await dispatchAddExecHistoryEntry(store, {});
    await dispatchAddExecHistoryEntry(store, {
      id: '2',
      pipelineId: 456,
      status: ExecutionStatus.RUNNING,
    });
    renderHistoryButton();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('enables button when historyButtonDisabled is true but executions exist', async () => {
    await dispatchAddExecHistoryEntry(store, {});
    renderHistoryButton(jest.fn(), true);
    const historyButton = getHistoryButtonElement();
    expect(historyButton).toBeEnabled();
  });

  it('filters executions by assetName', async () => {
    await dispatchAddExecHistoryEntry(store, {});
    await dispatchAddExecHistoryEntry(store, {
      id: '2',
      dtName: 'different-asset',
      pipelineId: 456,
    });
    await dispatchAddExecHistoryEntry(store, {
      id: '3',
      pipelineId: 789,
      status: ExecutionStatus.RUNNING,
    });
    renderHistoryButton();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
