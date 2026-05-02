import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MeasurementTable from 'route/measurement/MeasurementTable';
import {
  createMockTask,
  createMockTaskPending,
  createMockTrial,
  createMockExecution,
} from 'test/unit/model/backend/gitlab/measure/measurement.testUtil';

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
  RunnerTagBadge: ({ runnerTag }: { runnerTag: string }) => (
    <span data-testid="runner-tag-badge">{runnerTag}</span>
  ),
  statusColorMap: {
    NOT_STARTED: '#9e9e9e',
    PENDING: '#ff9800',
    RUNNING: '#2196f3',
    SUCCESS: '#4caf50',
    FAILURE: '#f44336',
    STOPPED: '#616161',
  },
}));

describe('MeasurementTable', () => {
  const mockDownload = jest.fn();
  const mockToggleTask = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders table headers', () => {
    render(
      <MeasurementTable
        results={[]}
        currentTaskIndex={null}
        currentExecutions={[]}
        onDownloadTask={mockDownload}
        primaryRunnerTag="linux"
        secondaryRunnerTag="windows"
        primaryDTName="dt-primary"
        secondaryDTName="dt-secondary"
        isRunning={false}
        disabledTaskNames={[]}
        onToggleTask={mockToggleTask}
      />,
    );

    expect(screen.getByText('Task')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Average Duration')).toBeInTheDocument();
    expect(screen.getByText('Trials')).toBeInTheDocument();
    expect(screen.getByText('Data')).toBeInTheDocument();
  });

  it('renders rows for each task', () => {
    const results = [
      createMockTaskPending({ 'Task Name': 'Task A', Description: 'First' }),
      createMockTaskPending({ 'Task Name': 'Task B', Description: 'Second' }),
    ];

    render(
      <MeasurementTable
        results={results}
        currentTaskIndex={null}
        currentExecutions={[]}
        onDownloadTask={mockDownload}
        primaryRunnerTag="linux"
        secondaryRunnerTag="windows"
        primaryDTName="dt-primary"
        secondaryDTName="dt-secondary"
        isRunning={false}
        disabledTaskNames={[]}
        onToggleTask={mockToggleTask}
      />,
    );

    expect(screen.getByText('Task A')).toBeInTheDocument();
    expect(screen.getByText('Task B')).toBeInTheDocument();
  });

  it('shows dash for NOT_STARTED status', () => {
    const results = [createMockTaskPending({ 'Task Name': 'Pending Task' })];

    render(
      <MeasurementTable
        results={results}
        currentTaskIndex={null}
        currentExecutions={[]}
        onDownloadTask={mockDownload}
        primaryRunnerTag="linux"
        secondaryRunnerTag="windows"
        primaryDTName="dt-primary"
        secondaryDTName="dt-secondary"
        isRunning={false}
        disabledTaskNames={[]}
        onToggleTask={mockToggleTask}
      />,
    );

    // Status column shows dash for NOT_STARTED
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('shows average time when available', () => {
    const results = [
      createMockTask({
        'Task Name': 'Completed',
        'Average Time (s)': 15.5,
        Status: 'SUCCESS',
        Trials: [createMockTrial({ Status: 'SUCCESS' })],
      }),
    ];

    render(
      <MeasurementTable
        results={results}
        currentTaskIndex={null}
        currentExecutions={[]}
        onDownloadTask={mockDownload}
        primaryRunnerTag="linux"
        secondaryRunnerTag="windows"
        primaryDTName="dt-primary"
        secondaryDTName="dt-secondary"
        isRunning={false}
        disabledTaskNames={[]}
        onToggleTask={mockToggleTask}
      />,
    );

    expect(screen.getByText('15.5s')).toBeInTheDocument();
  });

  it('renders trial card for completed task', () => {
    const results = [
      createMockTask({
        'Task Name': 'Done',
        Status: 'SUCCESS',
        Trials: [
          createMockTrial({
            Status: 'SUCCESS',
            Execution: [createMockExecution()],
          }),
        ],
      }),
    ];

    render(
      <MeasurementTable
        results={results}
        currentTaskIndex={null}
        currentExecutions={[]}
        onDownloadTask={mockDownload}
        primaryRunnerTag="linux"
        secondaryRunnerTag="windows"
        primaryDTName="dt-primary"
        secondaryDTName="dt-secondary"
        isRunning={false}
        disabledTaskNames={[]}
        onToggleTask={mockToggleTask}
      />,
    );

    expect(screen.getByTestId('trial-card')).toBeInTheDocument();
    expect(screen.getByText('Trial 1 - SUCCESS')).toBeInTheDocument();
  });

  it('renders active task trial card with current executions', () => {
    const results = [
      createMockTask({
        'Task Name': 'Running',
        Status: 'RUNNING',
        Trials: [],
        ExpectedTrials: 3,
      }),
    ];

    const currentExecutions = [
      createMockExecution({ dtName: 'dt1', status: 'Parent pipeline running' }),
    ];

    render(
      <MeasurementTable
        results={results}
        currentTaskIndex={0}
        currentExecutions={currentExecutions}
        onDownloadTask={mockDownload}
        primaryRunnerTag="linux"
        secondaryRunnerTag="windows"
        primaryDTName="dt-primary"
        secondaryDTName="dt-secondary"
        isRunning={true}
        disabledTaskNames={[]}
        onToggleTask={mockToggleTask}
      />,
    );

    expect(screen.getByTestId('trial-card')).toBeInTheDocument();
    expect(screen.getByText('Trial 1 - RUNNING')).toBeInTheDocument();
  });

  it('renders runner tag badges', () => {
    const results = [
      createMockTaskPending({
        'Task Name': 'Multi-runner',
        Executions: () => [
          { dtName: 'dt1', config: { 'Runner tag': 'linux' } },
        ],
      }),
    ];

    render(
      <MeasurementTable
        results={results}
        currentTaskIndex={null}
        currentExecutions={[]}
        onDownloadTask={mockDownload}
        primaryRunnerTag="linux"
        secondaryRunnerTag="windows"
        primaryDTName="dt-primary"
        secondaryDTName="dt-secondary"
        isRunning={false}
        disabledTaskNames={[]}
        onToggleTask={mockToggleTask}
      />,
    );

    const badges = screen.getAllByTestId('runner-tag-badge');
    expect(badges.length).toBeGreaterThan(0);
  });
});
