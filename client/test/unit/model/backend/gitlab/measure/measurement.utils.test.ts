import {
  secondsDifference,
  getTotalTime,
  computeAverageTime,
  computeFinalStatus,
  isTaskComplete,
  areAllMeasurementsComplete,
  getMeasurementStatus,
  mergeExecutionStatus,
} from 'model/backend/gitlab/measure/measurement.utils';
import {
  statusColorMap,
  getExecutionStatusColor,
} from 'route/measurement/MeasurementComponents';
import {
  createMockTask,
  createMockTrial,
  createMockExecution,
  createMockActivePipeline,
  DEFAULT_CONFIG,
} from 'test/unit/model/backend/gitlab/measure/measurement.testUtil';

describe('measurement.utils', () => {
  describe('statusColorMap', () => {
    it('should have colors for all status types', () => {
      expect(statusColorMap.PENDING).toBeDefined();
      expect(statusColorMap.RUNNING).toBeDefined();
      expect(statusColorMap.FAILURE).toBeDefined();
      expect(statusColorMap.SUCCESS).toBeDefined();
      expect(statusColorMap.STOPPED).toBeDefined();
    });
  });

  describe('getExecutionStatusColor', () => {
    it('should return correct color for success status', () => {
      expect(getExecutionStatusColor('success')).toBe('#1976d2');
    });

    it('should return correct color for failed status', () => {
      expect(getExecutionStatusColor('failed')).toBe('#d32f2f');
    });

    it('should return correct color for cancelled status', () => {
      expect(getExecutionStatusColor('cancelled')).toBe('#616161');
    });

    it('should return default color for unknown status', () => {
      expect(getExecutionStatusColor('unknown')).toBe('#9e9e9e');
    });
  });

  describe('secondsDifference', () => {
    it('should return undefined when startTime is undefined', () => {
      const endTime = new Date('2026-01-01T10:00:10.000Z');
      expect(secondsDifference(undefined, endTime)).toBeUndefined();
    });

    it('should return undefined when endTime is undefined', () => {
      const startTime = new Date('2026-01-01T10:00:00.000Z');
      expect(secondsDifference(startTime, undefined)).toBeUndefined();
    });

    it('should return undefined when both times are undefined', () => {
      expect(secondsDifference(undefined, undefined)).toBeUndefined();
    });

    it('should return correct seconds difference', () => {
      const startTime = new Date('2026-01-01T10:00:00.000Z');
      const endTime = new Date('2026-01-01T10:00:10.000Z');
      expect(secondsDifference(startTime, endTime)).toBe(10);
    });

    it('should handle fractional seconds', () => {
      const startTime = new Date('2026-01-01T10:00:00.000Z');
      const endTime = new Date('2026-01-01T10:00:05.500Z');
      expect(secondsDifference(startTime, endTime)).toBe(5.5);
    });
  });

  describe('getTotalTime', () => {
    it('should return null when no tasks have start times', () => {
      const results = [
        createMockTask({ 'Time Start': undefined, 'Time End': undefined }),
      ];
      expect(getTotalTime(results)).toBeNull();
    });

    it('should return null when no tasks have end times', () => {
      const results = [
        createMockTask({
          'Time Start': new Date('2026-01-01T10:00:00.000Z'),
          'Time End': undefined,
        }),
      ];
      expect(getTotalTime(results)).toBeNull();
    });

    it('should return correct total time for single task', () => {
      const results = [createMockTask()];
      expect(getTotalTime(results)).toBe(30);
    });

    it('should return correct total time across multiple tasks', () => {
      const results = [
        createMockTask({
          'Time Start': new Date('2026-01-01T10:00:00.000Z'),
          'Time End': new Date('2026-01-01T10:00:20.000Z'),
        }),
        createMockTask({
          'Time Start': new Date('2026-01-01T10:00:10.000Z'),
          'Time End': new Date('2026-01-01T10:00:45.000Z'),
        }),
      ];
      expect(getTotalTime(results)).toBe(45);
    });
  });

  describe('computeAverageTime', () => {
    it('should return undefined for empty trials array', () => {
      expect(computeAverageTime([])).toBeUndefined();
    });

    it('should return undefined when no trials have complete times', () => {
      const trials = [
        createMockTrial({ 'Time Start': undefined, 'Time End': undefined }),
        createMockTrial({
          'Time Start': new Date(),
          'Time End': undefined,
        }),
      ];
      expect(computeAverageTime(trials)).toBeUndefined();
    });

    it('should return correct average for single trial', () => {
      const trials = [
        createMockTrial({
          'Time Start': new Date('2026-01-01T10:00:00.000Z'),
          'Time End': new Date('2026-01-01T10:00:10.000Z'),
        }),
      ];
      expect(computeAverageTime(trials)).toBe(10);
    });

    it('should return correct average for multiple trials', () => {
      const trials = [
        createMockTrial({
          'Time Start': new Date('2026-01-01T10:00:00.000Z'),
          'Time End': new Date('2026-01-01T10:00:10.000Z'),
        }),
        createMockTrial({
          'Time Start': new Date('2026-01-01T10:01:00.000Z'),
          'Time End': new Date('2026-01-01T10:01:20.000Z'),
        }),
        createMockTrial({
          'Time Start': new Date('2026-01-01T10:02:00.000Z'),
          'Time End': new Date('2026-01-01T10:02:15.000Z'),
        }),
      ];
      expect(computeAverageTime(trials)).toBe(15);
    });

    it('should ignore trials without complete times', () => {
      const trials = [
        createMockTrial({
          'Time Start': new Date('2026-01-01T10:00:00.000Z'),
          'Time End': new Date('2026-01-01T10:00:10.000Z'),
        }),
        createMockTrial({
          'Time Start': undefined,
          'Time End': undefined,
        }),
        createMockTrial({
          'Time Start': new Date('2026-01-01T10:01:00.000Z'),
          'Time End': new Date('2026-01-01T10:01:20.000Z'),
        }),
      ];
      expect(computeAverageTime(trials)).toBe(15);
    });
  });

  describe('computeFinalStatus', () => {
    it('should return STOPPED when wasStopped and trials incomplete', () => {
      const trials = [createMockTrial({ Status: 'SUCCESS' })];
      expect(computeFinalStatus(trials, 3, true)).toBe('STOPPED');
    });

    it('should return STOPPED when any trial has STOPPED status', () => {
      const trials = [
        createMockTrial({ Status: 'SUCCESS' }),
        createMockTrial({ Status: 'STOPPED' }),
        createMockTrial({ Status: 'SUCCESS' }),
      ];
      expect(computeFinalStatus(trials, 3, false)).toBe('STOPPED');
    });

    it('should return FAILURE when any trial has FAILURE status', () => {
      const trials = [
        createMockTrial({ Status: 'SUCCESS' }),
        createMockTrial({ Status: 'FAILURE' }),
        createMockTrial({ Status: 'SUCCESS' }),
      ];
      expect(computeFinalStatus(trials, 3, false)).toBe('FAILURE');
    });

    it('should return SUCCESS when all trials succeeded', () => {
      const trials = [
        createMockTrial({ Status: 'SUCCESS' }),
        createMockTrial({ Status: 'SUCCESS' }),
        createMockTrial({ Status: 'SUCCESS' }),
      ];
      expect(computeFinalStatus(trials, 3, false)).toBe('SUCCESS');
    });

    it('should return SUCCESS when expected trials complete even with wasStopped', () => {
      const trials = [
        createMockTrial({ Status: 'SUCCESS' }),
        createMockTrial({ Status: 'SUCCESS' }),
        createMockTrial({ Status: 'SUCCESS' }),
      ];
      expect(computeFinalStatus(trials, 3, true)).toBe('SUCCESS');
    });
  });

  describe('isTaskComplete', () => {
    it('should return true for SUCCESS status', () => {
      expect(isTaskComplete({ Status: 'SUCCESS' })).toBe(true);
    });

    it('should return true for FAILURE status', () => {
      expect(isTaskComplete({ Status: 'FAILURE' })).toBe(true);
    });

    it('should return false for PENDING status', () => {
      expect(isTaskComplete({ Status: 'PENDING' })).toBe(false);
    });

    it('should return false for RUNNING status', () => {
      expect(isTaskComplete({ Status: 'RUNNING' })).toBe(false);
    });

    it('should return false for STOPPED status', () => {
      expect(isTaskComplete({ Status: 'STOPPED' })).toBe(false);
    });

    it('should return false for NOT_STARTED status', () => {
      expect(isTaskComplete({ Status: 'NOT_STARTED' })).toBe(false);
    });
  });

  describe('areAllMeasurementsComplete', () => {
    it('should return false for empty array', () => {
      expect(areAllMeasurementsComplete([])).toBe(false);
    });

    it('should return false if any task has STOPPED status', () => {
      const tasks = [
        createMockTask({ Status: 'SUCCESS' }),
        createMockTask({ Status: 'STOPPED' }),
      ];
      expect(areAllMeasurementsComplete(tasks)).toBe(false);
    });

    it('should return false if not all tasks are complete', () => {
      const tasks = [
        createMockTask({ Status: 'SUCCESS' }),
        createMockTask({ Status: 'RUNNING' }),
      ];
      expect(areAllMeasurementsComplete(tasks)).toBe(false);
    });

    it('should return true when all tasks are SUCCESS', () => {
      const tasks = [
        createMockTask({ Status: 'SUCCESS' }),
        createMockTask({ Status: 'SUCCESS' }),
      ];
      expect(areAllMeasurementsComplete(tasks)).toBe(true);
    });

    it('should return true when all tasks are SUCCESS or FAILURE', () => {
      const tasks = [
        createMockTask({ Status: 'SUCCESS' }),
        createMockTask({ Status: 'FAILURE' }),
      ];
      expect(areAllMeasurementsComplete(tasks)).toBe(true);
    });
  });

  describe('getMeasurementStatus', () => {
    it('should return hasStarted false when all tasks are NOT_STARTED', () => {
      const results = [
        createMockTask({ Status: 'NOT_STARTED' }),
        createMockTask({ Status: 'PENDING' }),
      ];
      const status = getMeasurementStatus(results);
      expect(status.hasStarted).toBe(false);
    });

    it('should return hasStarted true when a task is RUNNING', () => {
      const results = [
        createMockTask({ Status: 'RUNNING' }),
        createMockTask({ Status: 'NOT_STARTED' }),
      ];
      const status = getMeasurementStatus(results);
      expect(status.hasStarted).toBe(true);
    });

    it('should count completedTasks correctly', () => {
      const results = [
        createMockTask({ Status: 'SUCCESS' }),
        createMockTask({ Status: 'FAILURE' }),
        createMockTask({ Status: 'RUNNING' }),
      ];
      const status = getMeasurementStatus(results);
      expect(status.completedTasks).toBe(2);
    });

    it('should count completedTrials correctly', () => {
      const results = [
        createMockTask({
          Status: 'SUCCESS',
          Trials: [
            createMockTrial({ Status: 'SUCCESS' }),
            createMockTrial({ Status: 'FAILURE' }),
            createMockTrial({ Status: 'RUNNING' }),
          ],
        }),
      ];
      const status = getMeasurementStatus(results);
      expect(status.completedTrials).toBe(2);
    });

    it('should return totalTasks as the length of results', () => {
      const results = [createMockTask(), createMockTask(), createMockTask()];
      const status = getMeasurementStatus(results);
      expect(status.totalTasks).toBe(3);
    });

    it('should return all zeros for empty results', () => {
      const status = getMeasurementStatus([]);
      expect(status).toEqual({
        hasStarted: false,
        completedTasks: 0,
        completedTrials: 0,
        totalTasks: 0,
      });
    });
  });

  describe('mergeExecutionStatus', () => {
    it('should return completed result when execution has a completed match', () => {
      const executions = [{ dtName: 'dt1', config: {} }];
      const completed = [
        createMockExecution({
          dtName: 'dt1',
          pipelineId: 10,
          status: 'success',
          executionIndex: 0,
        }),
      ];
      const result = mergeExecutionStatus(
        executions,
        [],
        completed,
        DEFAULT_CONFIG,
      );
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('success');
      expect(result[0].pipelineId).toBe(10);
    });

    it('should return active pipeline status when no completed match', () => {
      const executions = [{ dtName: 'dt1', config: {} }];
      const active = [
        createMockActivePipeline({
          dtName: 'dt1',
          pipelineId: 20,
          status: 'running',
          phase: 'parent',
        }),
      ];
      // Set executionIndex on the active pipeline
      (active[0] as unknown as { executionIndex: number }).executionIndex = 0;
      const result = mergeExecutionStatus(
        executions,
        active,
        [],
        DEFAULT_CONFIG,
      );
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('Parent pipeline running');
    });

    it('should return placeholder when no completed or active match', () => {
      const executions = [{ dtName: 'dt1', config: { 'Runner tag': 'linux' } }];
      const result = mergeExecutionStatus(executions, [], [], DEFAULT_CONFIG);
      expect(result).toHaveLength(1);
      expect(result[0].dtName).toBe('dt1');
      expect(result[0].pipelineId).toBeNull();
      expect(result[0].status).toBe('—');
    });

    it('should merge config with defaultConfig for placeholder executions', () => {
      const executions = [
        { dtName: 'dt1', config: { 'Runner tag': 'windows' } },
      ];
      const result = mergeExecutionStatus(executions, [], [], DEFAULT_CONFIG);
      expect(result[0].config).toEqual({
        ...DEFAULT_CONFIG,
        'Runner tag': 'windows',
      });
    });

    it('should append active pipelines to completed when no executions defined', () => {
      const completed = [
        createMockExecution({ dtName: 'dt1', pipelineId: 10 }),
      ];
      const active = [
        createMockActivePipeline({
          dtName: 'dt2',
          pipelineId: 20,
          status: 'running',
        }),
      ];
      const result = mergeExecutionStatus(
        [],
        active,
        completed,
        DEFAULT_CONFIG,
      );
      expect(result).toHaveLength(2);
      expect(result[0].dtName).toBe('dt1');
      expect(result[1].dtName).toBe('dt2');
    });

    it('should not duplicate completed pipelines in fallback path', () => {
      const completed = [
        createMockExecution({ dtName: 'dt1', pipelineId: 10 }),
      ];
      const active = [
        createMockActivePipeline({
          dtName: 'dt1',
          pipelineId: 10,
          status: 'success',
        }),
      ];
      const result = mergeExecutionStatus(
        [],
        active,
        completed,
        DEFAULT_CONFIG,
      );
      expect(result).toHaveLength(1);
      expect(result[0].pipelineId).toBe(10);
    });
  });
});
