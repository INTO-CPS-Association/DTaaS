import {
  measurementState,
  saveOriginalSettings,
  restoreOriginalSettings,
  setMeasurementStore,
} from 'model/backend/gitlab/measure/measurement.execution';
import { createMockStoreState } from 'test/unit/model/backend/gitlab/measure/measurement.testUtil';
import { setupSessionStorage } from 'test/unit/model/backend/gitlab/measure/measurement.envSetup';

jest.mock('util/envUtil', () => ({
  getAuthority: jest.fn(),
}));

describe('measurement.execution', () => {
  const mockGetState = jest.fn();
  const mockRestoreRunnerTag = jest.fn();
  const mockRestoreBranchName = jest.fn();
  const mockRestoreSecondaryRunnerTag = jest.fn();

  let originalMeasurementState: typeof measurementState;

  beforeEach(() => {
    jest.clearAllMocks();
    originalMeasurementState = { ...measurementState };
    measurementState.shouldStopPipelines = false;
    measurementState.activePipelines = [];
    measurementState.executionResults = [];
    measurementState.currentMeasurementPromise = null;
    measurementState.currentTrialMinPipelineId = null;

    setupSessionStorage();

    mockGetState.mockReturnValue(
      createMockStoreState({
        RUNNER_TAG: 'linux',
        BRANCH_NAME: 'main',
      }),
    );
    setMeasurementStore({
      getState: mockGetState,
      restoreRunnerTag: mockRestoreRunnerTag,
      restoreBranchName: mockRestoreBranchName,
      restoreSecondaryRunnerTag: mockRestoreSecondaryRunnerTag,
      showSnackbar: jest.fn(),
    });
  });

  afterEach(() => {
    measurementState.shouldStopPipelines =
      originalMeasurementState.shouldStopPipelines;
    measurementState.activePipelines = originalMeasurementState.activePipelines;
    measurementState.executionResults =
      originalMeasurementState.executionResults;
    measurementState.currentMeasurementPromise =
      originalMeasurementState.currentMeasurementPromise;
  });

  describe('measurementState', () => {
    it('should have correct initial values', () => {
      expect(measurementState.shouldStopPipelines).toBe(false);
      expect(measurementState.activePipelines).toEqual([]);
      expect(measurementState.executionResults).toEqual([]);
      expect(measurementState.currentMeasurementPromise).toBeNull();
    });

    it('should allow modifying shouldStopPipelines', () => {
      measurementState.shouldStopPipelines = true;
      expect(measurementState.shouldStopPipelines).toBe(true);
    });
  });

  describe('saveOriginalSettings', () => {
    it('should save settings from store state', () => {
      mockGetState.mockReturnValue(
        createMockStoreState({
          RUNNER_TAG: 'custom-runner',
          BRANCH_NAME: 'develop',
        }),
      );

      restoreOriginalSettings();
      saveOriginalSettings();

      expect(mockGetState).toHaveBeenCalled();
    });

    it('should only save settings once if called multiple times', () => {
      restoreOriginalSettings();

      mockGetState.mockReturnValue(
        createMockStoreState({
          RUNNER_TAG: 'first-runner',
          BRANCH_NAME: 'first-branch',
        }),
      );

      saveOriginalSettings();
      const firstCallCount = mockGetState.mock.calls.length;

      mockGetState.mockReturnValue(
        createMockStoreState({
          RUNNER_TAG: 'second-runner',
          BRANCH_NAME: 'second-branch',
        }),
      );

      saveOriginalSettings();

      expect(mockGetState.mock.calls.length).toBe(firstCallCount);
    });
  });

  describe('restoreOriginalSettings', () => {
    it('should dispatch actions to restore settings', () => {
      restoreOriginalSettings();

      mockGetState.mockReturnValue(
        createMockStoreState({
          RUNNER_TAG: 'saved-runner',
          BRANCH_NAME: 'saved-branch',
        }),
      );

      saveOriginalSettings();
      jest.clearAllMocks();

      mockGetState.mockReturnValue(
        createMockStoreState({
          RUNNER_TAG: 'changed-runner',
          BRANCH_NAME: 'changed-branch',
        }),
      );

      restoreOriginalSettings();

      expect(mockRestoreRunnerTag).toHaveBeenCalledWith('saved-runner');
      expect(mockRestoreBranchName).toHaveBeenCalledWith('saved-branch');
    });

    it('should not dispatch if no settings were saved', () => {
      restoreOriginalSettings();
      jest.clearAllMocks();

      restoreOriginalSettings();

      expect(mockRestoreRunnerTag).not.toHaveBeenCalled();
      expect(mockRestoreBranchName).not.toHaveBeenCalled();
      expect(mockRestoreSecondaryRunnerTag).not.toHaveBeenCalled();
    });
  });
});
