import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExecutionHistoryList from 'components/execution/ExecutionHistoryList';
import { Provider, useSelector } from 'react-redux';
import { ExecutionStatus } from 'model/backend/interfaces/execution';
import { setSelectedExecutionId } from 'model/backend/state/executionHistory.slice';
import {
  createTestStore,
  waitForAccordionTransitions,
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

describe('ExecutionHistoryList - details and dialogs', () => {
  const { dtName, mockOnViewLogs, mockDispatch } = ctx;

  beforeEach(() => setupBeforeEach(ctx));

  afterEach(async () => teardownAfterEach(ctx));

  it('handles accordion details rendering with no selected execution', async () => {
    const mockExecutions = [
      {
        id: 'exec1',
        dtName: 'test-dt',
        pipelineId: 1001,
        timestamp: 1620000000000,
        status: ExecutionStatus.TIMEOUT,
        jobLogs: [],
      },
    ];
    ctx.testStore = createTestStore(mockExecutions);
    useSelectorFromStore(ctx);

    render(
      <Provider store={ctx.testStore}>
        <ExecutionHistoryList dtName={dtName} onViewLogs={mockOnViewLogs} />
      </Provider>,
    );

    const accordion = screen
      .getAllByRole('button')
      .find((button) =>
        button.getAttribute('aria-controls')?.includes('execution-'),
      );

    expect(accordion).toBeDefined();
    if (accordion) {
      fireEvent.click(accordion);
      await waitForAccordionTransitions();
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 200);
      });

      const expandedRegion = screen.getByRole('region');
      expect(expandedRegion).toBeInTheDocument();
      const accordionDetails = expandedRegion.querySelector(
        '.MuiAccordionDetails-root',
      );
      expect(accordionDetails).toBeInTheDocument();
    }
  });

  it('handles accordion details rendering with selected execution but no logs', async () => {
    const executionWithNoLogs = {
      id: 'exec-no-logs',
      dtName: 'test-dt',
      pipelineId: 9999,
      timestamp: Date.now(),
      status: ExecutionStatus.COMPLETED,
      jobLogs: [],
    };
    ctx.testStore = createTestStore([executionWithNoLogs]);
    ctx.testStore.dispatch(setSelectedExecutionId('exec-no-logs'));

    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      (selector) => {
        const state = ctx.testStore.getState();
        if (selector.toString().includes('selectSelectedExecution')) {
          return executionWithNoLogs;
        }
        return selector(state);
      },
    );

    render(
      <Provider store={ctx.testStore}>
        <ExecutionHistoryList dtName={dtName} onViewLogs={mockOnViewLogs} />
      </Provider>,
    );

    const accordion = screen
      .getAllByRole('button')
      .find((button) =>
        button.getAttribute('aria-controls')?.includes('execution-'),
      );
    expect(accordion).toBeDefined();
    if (accordion) {
      fireEvent.click(accordion);
      await waitForAccordionTransitions();
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 100);
      });

      expect(screen.getByText('No logs available')).toBeInTheDocument();
    }
  });

  it('handles delete dialog cancel correctly', async () => {
    const mockExecutions = [
      {
        id: 'exec1',
        dtName: 'test-dt',
        pipelineId: 1001,
        timestamp: 1620000000000,
        status: ExecutionStatus.COMPLETED,
        jobLogs: [],
      },
    ];
    ctx.testStore = createTestStore(mockExecutions);
    useSelectorFromStore(ctx);

    render(
      <Provider store={ctx.testStore}>
        <ExecutionHistoryList dtName={dtName} onViewLogs={mockOnViewLogs} />
      </Provider>,
    );

    fireEvent.click(screen.getAllByLabelText(/delete/i)[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('handles delete dialog confirm correctly', () => {
    mockDispatch.mockClear();
    const testMockExecutions = [
      {
        id: 'exec1',
        dtName: 'test-dt',
        pipelineId: 1001,
        timestamp: 1620000000000,
        status: ExecutionStatus.COMPLETED,
        jobLogs: [],
      },
    ];
    ctx.testStore = createTestStore(testMockExecutions);
    useSelectorFromStore(ctx);

    render(
      <Provider store={ctx.testStore}>
        <ExecutionHistoryList dtName={dtName} onViewLogs={mockOnViewLogs} />
      </Provider>,
    );

    fireEvent.click(screen.getAllByLabelText(/delete/i)[0]);

    const confirmButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(confirmButton);

    expect(mockDispatch).toHaveBeenCalledWith(expect.any(Function));
  });
});
