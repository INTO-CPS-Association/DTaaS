import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useDispatch, useSelector } from 'react-redux';
import LogDialog from 'components/LogDialog';

// Mock Redux hooks
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('model/backend/state/executionHistory.slice', () => {
  const defaultState = {
    entries: [],
    selectedExecutionId: null,
    loading: false,
    error: null,
  };

  const executionHistoryReducer = (
    action: { type: string; payload?: unknown },
    state = defaultState,
  ) => state;

  return {
    __esModule: true,
    default: executionHistoryReducer,
    fetchExecutionHistory: jest.fn((name: string) => ({
      type: 'fetchExecutionHistory',
      payload: name,
    })),
    setStorageService: jest.fn(),
    clearExecutionHistoryForDT: jest.fn((name: string) => ({
      type: 'clearExecutionHistoryForDT',
      payload: name,
    })),
    updateExecutionStatus: jest.fn(),
    setLoading: jest.fn(),
    setError: jest.fn(),
    setExecutionHistoryEntries: jest.fn(),
    setExecutionHistoryEntriesForDT: jest.fn(),
    addExecutionHistoryEntry: jest.fn(),
    updateExecutionHistoryEntry: jest.fn(),
    updateExecutionLogs: jest.fn(),
    removeExecutionHistoryEntry: jest.fn(),
    removeEntriesForDT: jest.fn(),
    setSelectedExecutionId: jest.fn(),
    clearEntries: jest.fn(),
  };
});

// Mock the IndexedDB service
jest.mock('database/executionHistoryDB', () => ({
  __esModule: true,
  default: {
    getByDTName: jest.fn(),
    getAll: jest.fn(),
    add: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteByDTName: jest.fn(),
  },
}));

jest.mock('components/execution/ExecutionHistoryList', () => {
  const ExecutionHistoryListMock = ({
    dtName,
    onViewLogs,
  }: {
    dtName: string;
    onViewLogs: (id: string) => void;
  }) => (
    <div data-testid="execution-history-list">
      <div data-testid="dt-name">{dtName}</div>
      <button onClick={() => onViewLogs('exec1')}>View Logs</button>
    </div>
  );
  return {
    __esModule: true,
    default: ExecutionHistoryListMock,
  };
});

describe('LogDialog', () => {
  const mockDispatch = jest.fn().mockImplementation((action) => {
    if (typeof action === 'function') {
      return action(mockDispatch, () => ({}), undefined);
    }
    return action;
  });
  const setShowLog = jest.fn();

  const renderLogDialog = (
    name = 'testDT',
    showLog = true,
    customSetShowLog = setShowLog,
  ) =>
    render(
      <LogDialog name={name} showLog={showLog} setShowLog={customSetShowLog} />,
    );

  const setupMocks = <T,>(
    selectorValue: T,
    dispatchImplementation?: jest.Mock,
  ): void => {
    (useSelector as jest.MockedFunction<typeof useSelector>).mockReturnValue(
      selectorValue,
    );
    (useDispatch as unknown as jest.Mock).mockReturnValue(
      dispatchImplementation ?? mockDispatch,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up default mocks for every test
    setupMocks([]); // Default empty execution history
  });

  const executionHistorySlice = jest.requireMock(
    'model/backend/state/executionHistory.slice',
  );

  it('renders the LogDialog with logs available', () => {
    setupMocks({
      jobLogs: [{ jobName: 'job', log: 'testLog' }],
    });

    renderLogDialog();
  });

  it('renders the LogDialog with execution history', () => {
    renderLogDialog();
    expect(screen.getByTestId('execution-history-list')).toBeInTheDocument();
    expect(screen.getByTestId('dt-name')).toHaveTextContent('testDT');
  });

  it('renders the execution history list by default', () => {
    renderLogDialog();
    expect(screen.getByTestId('execution-history-list')).toBeInTheDocument();
  });

  it('handles close button click', () => {
    renderLogDialog();
    fireEvent.click(screen.getByRole('button', { name: /Close/i }));
    expect(setShowLog).toHaveBeenCalledWith(false);
  });

  it('fetches execution history when dialog is shown', () => {
    renderLogDialog();
    expect(executionHistorySlice.fetchExecutionHistory).toHaveBeenCalledWith(
      'testDT',
    );
    expect(mockDispatch).toHaveBeenCalled();
  });

  it('handles view logs functionality correctly', () => {
    renderLogDialog();
    fireEvent.click(screen.getByText('View Logs'));
    expect(screen.getByText('View Logs')).toBeInTheDocument();
  });

  it('displays the correct title', () => {
    renderLogDialog();
    expect(screen.getByText('TestDT Execution History')).toBeInTheDocument();
  });

  it('does not render the dialog when showLog is false', () => {
    renderLogDialog('testDT', false);
    expect(
      screen.queryByTestId('execution-history-list'),
    ).not.toBeInTheDocument();
  });

  it('passes the correct dtName to ExecutionHistoryList', () => {
    renderLogDialog();
    expect(screen.getByTestId('dt-name')).toHaveTextContent('testDT');
  });

  it('does not fetch execution history when dialog is not shown', () => {
    mockDispatch.mockClear();
    renderLogDialog('testDT', false);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('handles clear all button click when executions exist', () => {
    setupMocks([
      { id: 'exec1', name: 'execution1' },
      { id: 'exec2', name: 'execution2' },
    ]);

    renderLogDialog();

    const clearAllButton = screen.getByRole('button', { name: /clear all/i });
    fireEvent.click(clearAllButton);

    expect(screen.getByText('Confirm Clear All')).toBeInTheDocument();
  });

  it('shows info notification when clear all is clicked with empty execution history', () => {
    setupMocks([]);
    renderLogDialog();

    const clearAllButton = screen.getByRole('button', { name: /clear all/i });
    fireEvent.click(clearAllButton);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'snackbar/showSnackbar',
      payload: {
        message: 'Execution history is already empty',
        severity: 'info',
      },
    });
  });

  it('handles clear all confirmation', () => {
    const mockClearAction = {
      type: 'clearExecutionHistoryForDT',
      payload: 'testDT',
    };

    setupMocks([{ id: 'exec1', name: 'execution1' }]);
    executionHistorySlice.clearExecutionHistoryForDT = jest.fn(
      () => mockClearAction,
    );

    renderLogDialog();

    fireEvent.click(screen.getByRole('button', { name: /clear all/i }));
    fireEvent.click(screen.getByRole('button', { name: /delete all/i }));

    expect(mockDispatch).toHaveBeenCalledWith(mockClearAction);
  });

  it('handles clear all cancellation', () => {
    const mockClearAction = {
      type: 'clearExecutionHistoryForDT',
      payload: 'testDT',
    };

    setupMocks([{ id: 'exec1', name: 'execution1' }]);
    executionHistorySlice.clearExecutionHistoryForDT = jest.fn(
      () => mockClearAction,
    );

    renderLogDialog();

    fireEvent.click(screen.getByRole('button', { name: /clear all/i }));
    expect(screen.getByText('Confirm Clear All')).toBeInTheDocument();

    mockDispatch.mockClear();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockDispatch).not.toHaveBeenCalledWith(mockClearAction);
  });
});
