import { measurementState } from 'model/backend/gitlab/measure/measurement.execution';
import { initInterruptedDialogOpen } from 'route/measurement/measurementPageState';

jest.mock('model/backend/gitlab/measure/measurement.execution', () => ({
  measurementState: {
    isRunning: false,
    currentTaskIndexUI: null,
    activePipelines: [],
    executionResults: [],
    restoredAfterRefresh: false,
  },
  getTasks: jest.fn(() => []),
  getDefaultConfig: jest.fn(() => ({})),
}));

jest.mock('model/backend/gitlab/measure/measurement.utils', () => ({
  mergeExecutionStatus: jest.fn(() => []),
}));

describe('initInterruptedDialogOpen', () => {
  it('returns false when the session was not restored after a refresh', () => {
    measurementState.restoredAfterRefresh = false;
    expect(initInterruptedDialogOpen()).toBe(false);
  });

  it('returns true once and clears the flag after a restored session', () => {
    measurementState.restoredAfterRefresh = true;

    expect(initInterruptedDialogOpen()).toBe(true);
    expect(measurementState.restoredAfterRefresh).toBe(false);
    expect(initInterruptedDialogOpen()).toBe(false);
  });
});
