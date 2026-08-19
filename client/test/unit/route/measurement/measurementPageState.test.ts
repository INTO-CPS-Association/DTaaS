import { measurementState } from '@into-cps-association/dt-automation';
import { initInterruptedDialogOpen } from 'route/measurement/measurementPageState';

jest.mock('@into-cps-association/dt-automation', () => ({
  ...jest.requireActual('@into-cps-association/dt-automation'),
  measurementState: {
    isRunning: false,
    currentTaskIndexUI: null,
    activePipelines: [],
    executionResults: [],
    restoredAfterRefresh: false,
  },
  getTasks: jest.fn(() => []),
  getDefaultConfig: jest.fn(() => ({})),
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
