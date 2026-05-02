import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Measurement from 'route/measurement/Measurement';
import {
  setupMeasurementComponentTest,
  createResultTask,
} from './measurement.testSetup';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  Link: ({ children, ...props }: { children: React.ReactNode; to: string }) => (
    <a {...props}>{children}</a>
  ),
}));

jest.mock('page/Layout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-layout">{children}</div>
  ),
}));

jest.mock('route/measurement/MeasurementComponents', () => ({
  TrialCard: ({
    trial,
    trialIndex,
  }: {
    trial: { Status: string };
    trialIndex: number;
  }) => (
    <div data-testid="trial-card">
      Trial {trialIndex + 1} - {trial.Status}
    </div>
  ),
  RunnerTagBadge: () => <span />,
  statusColorMap: {},
  getExecutionStatusColor: jest.fn(() => '#9e9e9e'),
}));

jest.mock('route/measurement/MeasurementControls', () => ({
  __esModule: true,
  default: (p: {
    isRunning: boolean;
    onStart: () => void;
    onRestart: () => void;
    onStop: () => void;
    onPurge: () => void;
  }) => (
    <div data-testid="measurement-controls">
      <span data-testid="is-running">
        {p.isRunning ? 'running' : 'stopped'}
      </span>
      <button data-testid="start-btn" onClick={p.onStart}>
        Start
      </button>
      <button data-testid="restart-btn" onClick={p.onRestart}>
        Restart
      </button>
      <button data-testid="stop-btn" onClick={p.onStop}>
        Stop
      </button>
      <button data-testid="purge-btn" onClick={p.onPurge}>
        Purge
      </button>
    </div>
  ),
  CompletionSummary: () => <div data-testid="completion-summary" />,
}));

jest.mock('route/measurement/MeasurementTable', () => ({
  __esModule: true,
  default: () => <div data-testid="measurement-table" />,
  TaskControls: () => <div data-testid="task-controls" />,
}));

const mockStartMeasurement = jest.fn().mockResolvedValue(undefined);
const mockStopAllPipelines = jest.fn().mockResolvedValue(undefined);

jest.mock('model/backend/gitlab/measure/measurement.runner', () => ({
  startMeasurement: (...args: unknown[]) => mockStartMeasurement(...args),
  stopAllPipelines: (...args: unknown[]) => mockStopAllPipelines(...args),
  restartMeasurement: jest.fn().mockResolvedValue(undefined),
  handleBeforeUnload: jest.fn(),
  handleUnload: jest.fn(),
  purgeMeasurementData: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('model/backend/gitlab/measure/measurement.utils', () => {
  const actual = jest.requireActual(
    'model/backend/gitlab/measure/measurement.utils',
  );
  return {
    getMeasurementStatus: jest.fn(() => ({
      hasStarted: false,
      completedTasks: 0,
      completedTrials: 0,
      totalTasks: 2,
    })),
    mergeExecutionStatus: jest.fn(() => []),
    areAllMeasurementsComplete: actual.areAllMeasurementsComplete,
    downloadTaskResultJson: jest.fn(),
  };
});

jest.mock('model/backend/gitlab/measure/measurement.execution', () => {
  const setup = jest.requireActual('./measurement.testSetup');
  const actual = jest.requireActual(
    'model/backend/gitlab/measure/measurement.execution',
  );
  return {
    measurementState: { ...setup.MOCK_MEASUREMENT_STATE },
    DEFAULT_MEASUREMENT: actual.DEFAULT_MEASUREMENT,
    attachSetters: jest.fn(),
    detachSetters: jest.fn(),
    getTasks: () => setup.MOCK_TASKS,
    getDefaultConfig: jest.fn(() => ({})),
  };
});

describe('Measurement snackbar and polling', () => {
  let mockDispatch: jest.Mock;

  beforeEach(() => {
    ({ mockDispatch } = setupMeasurementComponentTest());
  });

  type SnackbarClickCase = [btnId: string, message: string, severity: string];

  const snackbarClickCases: SnackbarClickCase[] = [
    ['start-btn', 'Measurement started', 'info'],
    ['restart-btn', 'Measurement restarted', 'info'],
    ['stop-btn', 'Stopping measurement...', 'warning'],
  ];

  it.each(snackbarClickCases)(
    'shows snackbar when %s is clicked',
    async (btnId, message, severity) => {
      render(<Measurement />);
      await act(async () => {
        fireEvent.click(screen.getByTestId(btnId));
      });
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'snackbar/showSnackbar',
          payload: { message, severity },
        }),
      );
    },
  );

  type CompletionSnackbarCase = [statuses: string[], expectedMessage: string];

  const completionSnackbarCases: CompletionSnackbarCase[] = [
    [['SUCCESS', 'STOPPED'], 'Measurement started'],
    [['SUCCESS', 'NOT_STARTED'], 'Measurement started'],
  ];

  it.each(completionSnackbarCases)(
    'completion snackbar for statuses %s shows: %s',
    async (statuses, expectedMessage) => {
      mockStartMeasurement.mockImplementationOnce((setters) => {
        setters.setResults([
          createResultTask(
            'Task 1',
            statuses[0],
            statuses[0] === 'SUCCESS' ? 10 : undefined,
          ),
          createResultTask(
            'Task 2',
            statuses[1],
            statuses[1] === 'SUCCESS' ? 15 : undefined,
          ),
        ]);
        return Promise.resolve();
      });
      render(<Measurement />);
      await act(async () => {
        fireEvent.click(screen.getByTestId('start-btn'));
      });
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'snackbar/showSnackbar',
          payload: { message: expectedMessage, severity: expect.any(String) },
        }),
      );
    },
  );

  it('resets completion snackbar flag on restart', async () => {
    mockStartMeasurement.mockImplementationOnce((setters) => {
      setters.setResults([
        createResultTask('Task 1', 'SUCCESS', 10),
        createResultTask('Task 2', 'SUCCESS', 15),
      ]);
      return Promise.resolve();
    });
    render(<Measurement />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('start-btn'));
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('restart-btn'));
    });
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'snackbar/showSnackbar',
        payload: {
          message: 'Measurement restarted',
          severity: expect.any(String),
        },
      }),
    );
  });

  it('updates currentExecutions from measurementState when running', async () => {
    jest.useFakeTimers();
    const measurementStateMock = jest.requireMock(
      'model/backend/gitlab/measure/measurement.execution',
    ).measurementState;

    measurementStateMock.activePipelines = [
      {
        dtName: 'test-dt',
        pipelineId: 123,
        config: { 'Runner tag': 'linux' },
        status: 'running',
        phase: 'parent',
      },
    ];
    measurementStateMock.executionResults = [
      {
        dtName: 'completed-dt',
        pipelineId: 100,
        status: 'success',
        config: { 'Runner tag': 'linux' },
      },
    ];

    mockStartMeasurement.mockImplementationOnce((setters) => {
      setters.setIsRunning(true);
      setters.setCurrentTaskIndex(0);
      return new Promise(() => {});
    });

    render(<Measurement />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('start-btn'));
    });
    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    const { mergeExecutionStatus } = jest.requireMock(
      'model/backend/gitlab/measure/measurement.utils',
    );
    expect(mergeExecutionStatus).toHaveBeenCalled();

    measurementStateMock.activePipelines = [];
    measurementStateMock.executionResults = [];
    jest.useRealTimers();
  });

  it('renders running trial card when currentTaskIndex matches', async () => {
    mockStartMeasurement.mockImplementationOnce((setters) => {
      setters.setCurrentTaskIndex(0);
      setters.setCurrentExecutions([
        {
          dtName: 'running-dt',
          pipelineId: 999,
          status: 'running',
          config: { 'Runner tag': 'linux' },
        },
      ]);
      return Promise.resolve();
    });

    render(<Measurement />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('start-btn'));
    });

    expect(screen.getByTestId('measurement-table')).toBeInTheDocument();
  });
});
