import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExecutionHistoryList from 'components/execution/ExecutionHistoryList';
import { Provider } from 'react-redux';
import { ExecutionStatus } from 'model/backend/interfaces/execution';
import {
  mockExecutions,
  createTestStore,
  createExecutionHistoryListContext,
  setupBeforeEach,
  teardownAfterEach,
  useSelectorFromStore,
} from './testSetup';

jest.mock('route/digitaltwins/execution/executionButtonHandlers');
jest.mock('model/backend/util/digitalTwinAdapter', () => {
  const adapterMocks = jest.requireActual('test/__mocks__/adapterMocks');
  const actual = jest.requireActual('model/backend/util/digitalTwinAdapter');
  return {
    ...adapterMocks.ADAPTER_MOCKS,
    extractDataFromDigitalTwin: actual.extractDataFromDigitalTwin,
  };
});

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('database/executionHistoryDB', () => ({
  __esModule: true,
  default: {
    getByDTName: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    add: jest.fn(),
    getAll: jest.fn(),
  },
}));

const ctx = createExecutionHistoryListContext();

describe('ExecutionHistoryList - rendering', () => {
  const { dtName, mockOnViewLogs } = ctx;

  beforeEach(() => setupBeforeEach(ctx));

  afterEach(async () => teardownAfterEach(ctx));

  it('renders loading state correctly', () => {
    ctx.testStore = createTestStore([], true);
    useSelectorFromStore(ctx);

    render(
      <Provider store={ctx.testStore}>
        <ExecutionHistoryList dtName={dtName} onViewLogs={mockOnViewLogs} />
      </Provider>,
    );

    const circularProgressElements = screen.getAllByTestId('circular-progress');
    expect(circularProgressElements.length).toBeGreaterThan(0);
  });

  it('renders empty state when no executions exist', () => {
    ctx.testStore = createTestStore([]);
    useSelectorFromStore(ctx);

    render(
      <Provider store={ctx.testStore}>
        <ExecutionHistoryList dtName={dtName} onViewLogs={mockOnViewLogs} />
      </Provider>,
    );

    expect(screen.getByText(/No execution history found/i)).toBeInTheDocument();
  });

  it('renders execution list with all status types', () => {
    ctx.testStore = createTestStore(mockExecutions);
    useSelectorFromStore(ctx);

    render(
      <Provider store={ctx.testStore}>
        <ExecutionHistoryList dtName={dtName} onViewLogs={mockOnViewLogs} />
      </Provider>,
    );

    expect(screen.getByText(/Completed/i)).toBeInTheDocument();
    expect(screen.getByText(/Failed/i)).toBeInTheDocument();
    expect(screen.getByText(/Running/i)).toBeInTheDocument();
    expect(screen.getByText(/Canceled/i)).toBeInTheDocument();
    expect(screen.getByText(/Timed out/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/delete/i).length).toBe(4);
    expect(screen.getByLabelText(/stop/i)).toBeInTheDocument();
  });

  it('renders error state correctly', () => {
    ctx.testStore = createTestStore(
      [],
      false,
      'Failed to fetch execution history',
    );
    useSelectorFromStore(ctx);

    render(
      <Provider store={ctx.testStore}>
        <ExecutionHistoryList dtName={dtName} onViewLogs={mockOnViewLogs} />
      </Provider>,
    );

    expect(screen.getByText(/No execution history found/i)).toBeInTheDocument();
  });

  it('renders action buttons correctly for running execution', () => {
    const mockRunningExecution = {
      id: 'exec-running',
      dtName: 'test-dt',
      pipelineId: 1234,
      timestamp: Date.now(),
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    };

    ctx.testStore = createTestStore([mockRunningExecution]);
    useSelectorFromStore(ctx);

    render(
      <Provider store={ctx.testStore}>
        <ExecutionHistoryList dtName={dtName} onViewLogs={mockOnViewLogs} />
      </Provider>,
    );

    expect(screen.getByLabelText('stop')).toBeInTheDocument();
    expect(screen.queryByLabelText('delete')).not.toBeInTheDocument();
    const runningElements = screen.getAllByText(
      (_content, element) => element?.textContent?.includes('Running') || false,
    );
    expect(runningElements.length).toBeGreaterThan(0);
  });

  it('handles a large number of executions correctly', () => {
    const largeExecutionList = Array.from({ length: 50 }, (_, i) => ({
      id: `exec-large-${i}`,
      dtName: 'test-dt',
      pipelineId: 2000 + i,
      timestamp: 1620000000000 + i * 10000,
      status: ExecutionStatus.COMPLETED,
      jobLogs: [],
    }));

    ctx.testStore = createTestStore(largeExecutionList);
    useSelectorFromStore(ctx);

    render(
      <Provider store={ctx.testStore}>
        <ExecutionHistoryList dtName={dtName} onViewLogs={mockOnViewLogs} />
      </Provider>,
    );

    const accordions = screen
      .getAllByRole('button')
      .filter((button) =>
        button.getAttribute('aria-controls')?.includes('execution-'),
      );
    expect(accordions.length).toBe(50);
    expect(screen.getAllByLabelText(/delete/i).length).toBe(50);
  });
});
