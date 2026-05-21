import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import Measurement from 'route/measurement/Measurement';
import { measurementState } from 'model/backend/gitlab/measure/measurement.execution';
import {
  MOCK_MEASUREMENT_STATE,
  setupMeasurementComponentTest,
} from './measurement.testSetup';

jest.mock('route/measurement/MeasurementControls', () => ({
  __esModule: true,
  default: () => <div data-testid="measurement-controls" />,
  CompletionSummary: () => <div data-testid="completion-summary" />,
}));

jest.mock('route/measurement/MeasurementTable', () => ({
  __esModule: true,
  default: () => <div data-testid="measurement-table" />,
}));

const mockMergeExecutionStatus = jest.fn(
  (
    _executions: unknown,
    _activePipelines: unknown,
    _completedResults: unknown,
    _defaultConfig: unknown,
  ) => [],
);

jest.mock('model/backend/gitlab/measure/measurement.utils', () => ({
  getMeasurementStatus: jest.fn(() => ({
    hasStarted: false,
    completedTasks: 0,
    completedTrials: 0,
  })),
  mergeExecutionStatus: (
    executions: unknown,
    activePipelines: unknown,
    completedResults: unknown,
    defaultConfig: unknown,
  ) =>
    mockMergeExecutionStatus(
      executions,
      activePipelines,
      completedResults,
      defaultConfig,
    ),
  downloadTaskResultJson: jest.fn(),
}));

jest.mock('model/backend/gitlab/measure/measurement.runner', () => {
  const setup = jest.requireActual('./measurement.testSetup');
  return setup.createRunnerStubs();
});

jest.mock('model/backend/gitlab/measure/measurement.execution', () => {
  const setup = jest.requireActual('./measurement.testSetup');
  return {
    measurementState: { ...setup.MOCK_MEASUREMENT_STATE },
    attachSetters: jest.fn(),
    detachSetters: jest.fn(),
    getDefaultConfig: jest.fn(() => ({ DTName: 'default-dt' })),
    getTasks: () => setup.MOCK_TASKS,
  };
});

describe('Measurement initial executions', () => {
  beforeEach(() => {
    setupMeasurementComponentTest();
    Object.assign(measurementState, {
      ...MOCK_MEASUREMENT_STATE,
      activePipelines: [{ dtName: 'hello-world', pipelineId: 11 }],
      currentTaskIndexUI: 0,
      executionResults: [{ dtName: 'hello-world', pipelineId: 11 }],
      isRunning: true,
    });
  });

  it('merges current executions when restoring an active measurement', () => {
    render(<Measurement />);

    expect(mockMergeExecutionStatus).toHaveBeenCalledWith(
      [{ dtName: 'hello-world', config: {} }],
      [{ dtName: 'hello-world', pipelineId: 11 }],
      [{ dtName: 'hello-world', pipelineId: 11 }],
      { DTName: 'default-dt' },
    );
  });
});
