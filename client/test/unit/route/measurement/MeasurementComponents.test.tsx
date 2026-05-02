import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RunnerTagBadge } from 'route/measurement/MeasurementComponents';
import { CompletionSummary } from 'route/measurement/MeasurementControls';
import { TaskControls } from 'route/measurement/MeasurementTable';
import { getRunnerTags } from 'model/backend/gitlab/measure/measurement.utils';
import {
  createMockTrial,
  createMockTaskPending as createMockTask,
} from 'test/unit/model/backend/gitlab/measure/measurement.testUtil';

jest.mock('model/backend/gitlab/measure/measurement.utils', () => {
  const actual = jest.requireActual(
    'model/backend/gitlab/measure/measurement.utils',
  );
  return {
    ...actual,
    getTotalTime: jest.fn(),
    downloadResultsJson: jest.fn(),
  };
});

const mockUtils = jest.requireMock(
  'model/backend/gitlab/measure/measurement.utils',
);
const mockGetTotalTime = mockUtils.getTotalTime as jest.Mock;

describe('MeasurementComponents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders primary badge with correct text', () => {
    render(<RunnerTagBadge runnerTag="linux" variant="primary" />);
    expect(screen.getByText('linux')).toBeInTheDocument();
  });

  it('renders secondary badge with correct text', () => {
    render(<RunnerTagBadge runnerTag="windows" variant="secondary" />);
    expect(screen.getByText('windows')).toBeInTheDocument();
  });

  it('returns only primary tag when task has no explicit runner configs', () => {
    const task = createMockTask({ Executions: undefined });
    const result = getRunnerTags(task, 'linux', 'windows');
    expect(result).toEqual({ primaryTag: 'linux', secondaryTag: null });
  });

  it('returns both tags when task executions have explicit Runner tag configs', () => {
    const task = createMockTask({
      Executions: () => [
        { dtName: 'hello-world', config: { 'Runner tag': 'linux' } },
        { dtName: 'hello-world', config: { 'Runner tag': 'windows' } },
      ],
    });
    const result = getRunnerTags(task, 'linux', 'windows');
    expect(result).toEqual({ primaryTag: 'linux', secondaryTag: 'windows' });
  });

  it('returns both tags even when they have the same value', () => {
    const task = createMockTask({
      Executions: () => [{ dtName: 'test', config: { 'Runner tag': 'linux' } }],
    });
    const result = getRunnerTags(task, 'linux', 'linux');
    expect(result).toEqual({ primaryTag: 'linux', secondaryTag: 'linux' });
  });

  it('returns null secondary tag when secondary tag is empty', () => {
    const task = createMockTask({ Executions: () => [] });
    const result = getRunnerTags(task, 'linux', '');
    expect(result).toEqual({ primaryTag: 'linux', secondaryTag: null });
  });

  it('shows dash when task has no completed trials', () => {
    const task = createMockTask({ Trials: [], ExpectedTrials: 3 });
    render(<TaskControls task={task} onDownloadTask={jest.fn()} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows download link when at least one trial is complete', () => {
    const mockDownload = jest.fn();
    const task = createMockTask({
      Trials: [
        createMockTrial({ Status: 'SUCCESS' }),
        createMockTrial({ Status: 'FAILURE' }),
      ],
      ExpectedTrials: 3,
    });
    render(<TaskControls task={task} onDownloadTask={mockDownload} />);
    const link = screen.getByText('Download Task Results');
    expect(link).toBeInTheDocument();
    fireEvent.click(link);
    expect(mockDownload).toHaveBeenCalledWith(task);
  });

  it('shows "Click Start" when measurement has not started', () => {
    mockGetTotalTime.mockReturnValue(null);
    const results = [createMockTask({ Status: 'NOT_STARTED' })];
    render(
      <CompletionSummary
        results={results}
        isRunning={false}
        hasStarted={false}
      />,
    );
    expect(
      screen.getByText('Click Start to generate measurement data'),
    ).toBeInTheDocument();
  });

  it('shows "in progress" when measurement is running', () => {
    mockGetTotalTime.mockReturnValue(null);
    const results = [createMockTask({ Status: 'RUNNING' })];
    render(
      <CompletionSummary
        results={results}
        isRunning={true}
        hasStarted={true}
      />,
    );
    expect(
      screen.getByText('Measurement data generation in progress'),
    ).toBeInTheDocument();
  });

  it('shows "in progress" when started but not complete', () => {
    mockGetTotalTime.mockReturnValue(null);
    const results = [
      createMockTask({ Status: 'SUCCESS' }),
      createMockTask({ Status: 'PENDING' }),
    ];
    render(
      <CompletionSummary
        results={results}
        isRunning={false}
        hasStarted={true}
      />,
    );
    expect(
      screen.getByText('Measurement data generation in progress'),
    ).toBeInTheDocument();
  });

  it('shows completion summary with concluded text when all complete', () => {
    mockGetTotalTime.mockReturnValue(45.5);
    const results = [
      createMockTask({ Status: 'SUCCESS' }),
      createMockTask({ Status: 'SUCCESS' }),
    ];
    render(
      <CompletionSummary
        results={results}
        isRunning={false}
        hasStarted={true}
      />,
    );
    expect(screen.getByText(/Completed in 45.5s/)).toBeInTheDocument();
    expect(
      screen.getByText('Measurement data generation complete'),
    ).toBeInTheDocument();
  });

  it('shows completion summary for mix of SUCCESS and FAILURE', () => {
    mockGetTotalTime.mockReturnValue(30);
    const results = [
      createMockTask({ Status: 'SUCCESS' }),
      createMockTask({ Status: 'FAILURE' }),
    ];
    render(
      <CompletionSummary
        results={results}
        isRunning={false}
        hasStarted={true}
      />,
    );
    expect(screen.getByText(/Completed in 30.0s/)).toBeInTheDocument();
    expect(
      screen.getByText('Measurement data generation complete'),
    ).toBeInTheDocument();
  });
});
