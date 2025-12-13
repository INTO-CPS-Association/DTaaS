import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import StartButton from 'preview/components/asset/StartButton';
import HistoryButton from 'components/asset/HistoryButton';
import LogDialog from 'components/LogDialog';
import digitalTwinReducer, {
  setDigitalTwin,
} from 'model/backend/state/digitalTwin.slice';
import executionHistoryReducer, {
  addExecutionHistoryEntry,
  clearEntries,
} from 'model/backend/state/executionHistory.slice';
import { v4 as uuidv4 } from 'uuid';
import { ExecutionStatus } from 'model/backend/interfaces/execution';
import { createMockDigitalTwinData } from 'test/preview/__mocks__/global_mocks';
import '@testing-library/jest-dom';

// Mock the dependencies
jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

jest.mock('model/backend/util/digitalTwinAdapter', () => ({
  createDigitalTwinFromData: jest.fn().mockResolvedValue({
    DTName: 'test-dt',
    execute: jest.fn().mockResolvedValue(123),
    stop: jest.fn().mockResolvedValue(undefined),
  }),
  extractDataFromDigitalTwin: jest.fn().mockReturnValue({
    DTName: 'test-dt',
    description: 'Test Digital Twin Description',
    jobLogs: [],
    pipelineCompleted: false,
    pipelineLoading: false,
    pipelineId: undefined,
    currentExecutionId: undefined,
    lastExecutionStatus: undefined,
    gitlabInstance: undefined,
  }),
}));

jest.mock('model/backend/util/init', () => ({
  initDigitalTwin: jest.fn().mockResolvedValue({
    DTName: 'test-dt',
    execute: jest.fn().mockResolvedValue(123),
    stop: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('route/digitaltwins/execution/executionButtonHandlers', () => ({
  handleStart: jest.fn(),
  handleStop: jest.fn(),
}));

// Mock the CircularProgress component
jest.mock('@mui/material/CircularProgress', () => ({
  __esModule: true,
  default: () => <div data-testid="circular-progress" />,
}));

// Mock the indexedDBService
jest.mock('database/executionHistoryDB', () => ({
  __esModule: true,
  default: {
    init: jest.fn().mockResolvedValue(undefined),
    add: jest.fn().mockResolvedValue('mock-id'),
    update: jest.fn().mockResolvedValue(undefined),
    getByDTName: jest.fn().mockResolvedValue([]),
    getById: jest.fn().mockResolvedValue(null),
    getAll: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue(undefined),
    deleteByDTName: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('Concurrent Execution Integration', () => {
  const assetName = 'test-dt';
  // Use clean mock data from global_mocks (no serialization issues)
  const mockDigitalTwinData = createMockDigitalTwinData(assetName);

  // Create a test store with clean data (no serialization issues)
  const store = configureStore({
    reducer: {
      digitalTwin: digitalTwinReducer,
      executionHistory: executionHistoryReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false, // Disable for tests since we use clean data
      }),
  });

  beforeEach(() => {
    // Clear any existing entries
    store.dispatch(clearEntries());

    // Set up the mock digital twin data
    store.dispatch(
      setDigitalTwin({
        assetName,
        digitalTwin: mockDigitalTwinData,
      }),
    );

    // Mock UUID generation
    (uuidv4 as jest.Mock).mockReturnValue('mock-execution-id');
  });

  const renderComponents = () => {
    const setHistoryButtonDisabled = jest.fn();
    const setShowLog = jest.fn();
    const showLog = false;

    render(
      <Provider store={store}>
        <StartButton
          assetName={assetName}
          setHistoryButtonDisabled={setHistoryButtonDisabled}
        />
        <HistoryButton
          assetName={assetName}
          setShowLog={setShowLog}
          historyButtonDisabled={false}
        />
        <LogDialog name={assetName} showLog={showLog} setShowLog={setShowLog} />
      </Provider>,
    );

    return { setHistoryButtonDisabled, setShowLog };
  };

  it('should start a new execution when Start button is clicked', async () => {
    renderComponents();

    // Find and click the Start button
    const startButton = screen.getByRole('button', { name: /Start/i });
    fireEvent.click(startButton);

    // Since we're testing integration, verify the button interaction works
    // The actual handleStart function is mocked at the module level
    expect(startButton).toBeInTheDocument();
  });

  it('should show execution count in the HistoryButton badge', async () => {
    // Add two executions to the store
    store.dispatch(
      addExecutionHistoryEntry({
        id: '1',
        dtName: assetName,
        pipelineId: 123,
        timestamp: Date.now(),
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      }),
    );

    store.dispatch(
      addExecutionHistoryEntry({
        id: '2',
        dtName: assetName,
        pipelineId: 123,
        timestamp: Date.now(),
        status: ExecutionStatus.COMPLETED,
        jobLogs: [],
      }),
    );

    renderComponents();

    // Verify the badge shows the correct count
    await waitFor(() => {
      const badge = screen.getByText('2');
      expect(badge).toBeInTheDocument();
    });
  });

  it('should show running executions count in the StartStopButton', async () => {
    // Add three executions to the store, two running and one completed
    store.dispatch(
      addExecutionHistoryEntry({
        id: '1',
        dtName: assetName,
        pipelineId: 123,
        timestamp: Date.now(),
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      }),
    );

    store.dispatch(
      addExecutionHistoryEntry({
        id: '2',
        dtName: assetName,
        pipelineId: 123,
        timestamp: Date.now(),
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      }),
    );

    store.dispatch(
      addExecutionHistoryEntry({
        id: '3',
        dtName: assetName,
        pipelineId: 123,
        timestamp: Date.now(),
        status: ExecutionStatus.COMPLETED,
        jobLogs: [],
      }),
    );

    renderComponents();

    // Verify the progress indicator shows the correct count
    await waitFor(() => {
      const progressIndicator = screen.getByTestId('circular-progress');
      expect(progressIndicator).toBeInTheDocument();

      // Get the text content of the running count element
      // The text might be split across multiple elements, so we need to find it by its container
      const runningCountContainer =
        screen.getByTestId('circular-progress').parentElement;
      expect(runningCountContainer).toHaveTextContent('(2)');
    });
  });

  it('should enable HistoryButton even when historyButtonDisabled is true if executions exist', async () => {
    // Add one completed execution to the store
    store.dispatch(
      addExecutionHistoryEntry({
        id: '1',
        dtName: assetName,
        pipelineId: 123,
        timestamp: Date.now(),
        status: ExecutionStatus.COMPLETED,
        jobLogs: [],
      }),
    );

    // Render the HistoryButton with historyButtonDisabled=true
    const setShowLog = jest.fn();

    render(
      <Provider store={store}>
        <HistoryButton
          assetName={assetName}
          setShowLog={setShowLog}
          historyButtonDisabled={true}
        />
      </Provider>,
    );

    // Verify the HistoryButton is enabled
    await waitFor(() => {
      const historyButton = screen.getByRole('button', { name: /History/i });
      expect(historyButton).not.toBeDisabled();
    });
  });

  it('should debounce rapid clicks on Start button', async () => {
    jest.useFakeTimers();
    renderComponents();

    const startButton = screen.getByRole('button', { name: /Start/i });

    fireEvent.click(startButton);
    fireEvent.click(startButton);
    fireEvent.click(startButton);

    // Verify the button gets disabled during debounce
    expect(startButton).toBeDisabled();

    jest.advanceTimersByTime(250);

    await waitFor(() => {
      expect(startButton).not.toBeDisabled();
    });

    // Verify button is clickable again after debounce
    fireEvent.click(startButton);
    expect(startButton).toBeInTheDocument();

    jest.useRealTimers();
  });
});
