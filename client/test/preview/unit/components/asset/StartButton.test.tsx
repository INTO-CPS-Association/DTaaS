import { fireEvent, render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { handleStart } from 'route/digitaltwins/execution/executionButtonHandlers';
import StartButton from 'preview/components/asset/StartButton';
import { ExecutionStatus, JobLog } from 'model/backend/interfaces/execution';
import * as redux from 'react-redux';

// Mock dependencies
jest.mock('route/digitaltwins/execution/executionButtonHandlers', () => ({
  handleStart: jest.fn(),
}));

// Mock the digitalTwin adapter to avoid real initialization
jest.mock('model/backend/util/digitalTwinAdapter', () => ({
  createDigitalTwinFromData: jest.fn().mockResolvedValue({
    DTName: 'testAssetName',
    execute: jest.fn().mockResolvedValue(123),
    jobLogs: [],
    pipelineLoading: false,
    pipelineCompleted: false,
    pipelineId: null,
    currentExecutionId: null,
    lastExecutionStatus: null,
  }),
}));

// Mock the initDigitalTwin function to avoid real GitLab initialization
jest.mock('model/backend/util/init', () => ({
  initDigitalTwin: jest.fn().mockResolvedValue({
    DTName: 'testAssetName',
    pipelineId: null,
    currentExecutionId: null,
    lastExecutionStatus: null,
    jobLogs: [],
    pipelineLoading: false,
    pipelineCompleted: false,
  }),
}));

// Mock CircularProgress component
jest.mock('@mui/material/CircularProgress', () => ({
  __esModule: true,
  default: () => <div data-testid="circular-progress" />,
}));

// Mock useSelector and useDispatch
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: () => mockDispatch,
}));

const mockDispatch = jest.fn();

interface MockExecutionEntry {
  id: string;
  dtName: string;
  pipelineId: number;
  timestamp: number;
  status: ExecutionStatus;
  jobLogs: JobLog[];
}

interface MockReduxStateOverrides {
  pipelineLoading?: boolean;
  executionEntries?: MockExecutionEntry[];
}

describe('StartButton', () => {
  const assetName = 'testAssetName';
  const setHistoryButtonDisabled = jest.fn();
  const mockDigitalTwin = {
    DTName: assetName,
    pipelineLoading: false,
  };

  const testEntry = (overrides = {}) => ({
    id: '1',
    dtName: 'testAssetName',
    pipelineId: 123,
    timestamp: Date.now(),
    status: ExecutionStatus.RUNNING,
    jobLogs: [],
    ...overrides,
  });

  const mockReduxState = (overrides: MockReduxStateOverrides = {}) => {
    (
      redux.useSelector as jest.MockedFunction<typeof redux.useSelector>
    ).mockImplementation((selector) => {
      const state = {
        digitalTwin: {
          digitalTwin: {
            [assetName]: {
              ...mockDigitalTwin,
              pipelineLoading: overrides.pipelineLoading ?? false,
            },
          },
        },
        executionHistory: {
          entries: overrides.executionEntries ?? [],
        },
      };
      return selector(state);
    });
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockDispatch.mockClear();
    mockReduxState();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  const renderComponent = () =>
    act(() => {
      render(
        <StartButton
          assetName={assetName}
          setHistoryButtonDisabled={setHistoryButtonDisabled}
        />,
      );
    });

  it('renders the Start button', () => {
    renderComponent();
    expect(screen.getByText('Start')).toBeInTheDocument();
  });

  it('handles button click', async () => {
    // Reset the mock to ensure clean state
    (handleStart as jest.Mock).mockClear();

    renderComponent();
    const startButton = screen.getByText('Start');

    await act(async () => {
      fireEvent.click(startButton);
      // Fast-forward timers to complete debounce
      jest.runAllTimers();
    });

    expect(handleStart).toHaveBeenCalled();
  });

  it('shows loading indicator when pipelineLoading is true', () => {
    mockReduxState({ pipelineLoading: true });
    renderComponent();
    expect(screen.getByTestId('circular-progress')).toBeInTheDocument();
  });

  it('shows loading indicator with count when there are running executions', () => {
    const executionEntries = [
      testEntry({}),
      testEntry({ id: '2', pipelineId: 456 }),
    ];
    mockReduxState({ executionEntries });
    renderComponent();
    expect(screen.getByTestId('circular-progress')).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('does not show loading indicator when there are no running executions', () => {
    const executionEntries = [testEntry({ status: ExecutionStatus.COMPLETED })];
    mockReduxState({ executionEntries });

    renderComponent();
    expect(screen.queryByTestId('circular-progress')).not.toBeInTheDocument();
  });

  it('handles different execution statuses correctly', () => {
    const executionEntries = [
      testEntry({ id: '1', pipelineId: 123, status: ExecutionStatus.RUNNING }),
      testEntry({
        id: '2',
        pipelineId: 456,
        status: ExecutionStatus.COMPLETED,
      }),
      testEntry({ id: '3', pipelineId: 789, status: ExecutionStatus.FAILED }),
    ];
    mockReduxState({ executionEntries });

    renderComponent();
    expect(screen.getByTestId('circular-progress')).toBeInTheDocument();
    expect(screen.getByText('(1)')).toBeInTheDocument(); // Only one running execution
  });
});
