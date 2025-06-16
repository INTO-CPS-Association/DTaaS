import {
  delay,
  hasTimedOut,
  determinePipelineId,
  getChildPipelineId,
  isPipelineCompleted,
  isPipelineRunning,
  shouldContinuePolling,
  getPollingInterval,
} from 'model/backend/gitlab/execution/pipelineCore';

describe('pipelineCore', () => {
  describe('delay', () => {
    it('should delay for specified milliseconds', async () => {
      const start = Date.now();
      await delay(100);
      const end = Date.now();
      expect(end - start).toBeGreaterThanOrEqual(90); // Allow some tolerance
    });
  });

  describe('hasTimedOut', () => {
    it('should return false for recent start time', () => {
      const recentTime = Date.now() - 1000; // 1 second ago
      expect(hasTimedOut(recentTime)).toBe(false);
    });

    it('should return true for old start time', () => {
      const oldTime = Date.now() - 15 * 60 * 1000; // 15 minutes ago
      expect(hasTimedOut(oldTime)).toBe(true);
    });

    it('should use custom max time', () => {
      const startTime = Date.now() - 2000; // 2 seconds ago
      expect(hasTimedOut(startTime, 1000)).toBe(true); // 1 second max
      expect(hasTimedOut(startTime, 5000)).toBe(false); // 5 second max
    });
  });

  describe('determinePipelineId', () => {
    it('should return execution pipeline id when available', () => {
      const result = determinePipelineId(123, 456);
      expect(result).toBe(123);
    });

    it('should return fallback pipeline id when execution id not available', () => {
      const result = determinePipelineId(undefined, 456);
      expect(result).toBe(456);
    });

    it('should throw error when no pipeline id available', () => {
      expect(() => determinePipelineId(undefined, undefined)).toThrow(
        'No pipeline ID available',
      );
    });
  });

  describe('getChildPipelineId', () => {
    it('should return parent pipeline id + 1', () => {
      expect(getChildPipelineId(100)).toBe(101);
      expect(getChildPipelineId(999)).toBe(1000);
    });
  });

  describe('isPipelineCompleted', () => {
    it('should return true for completed statuses', () => {
      expect(isPipelineCompleted('success')).toBe(true);
      expect(isPipelineCompleted('failed')).toBe(true);
    });

    it('should return false for non-completed statuses', () => {
      expect(isPipelineCompleted('running')).toBe(false);
      expect(isPipelineCompleted('pending')).toBe(false);
      expect(isPipelineCompleted('canceled')).toBe(false);
    });
  });

  describe('isPipelineRunning', () => {
    it('should return true for running statuses', () => {
      expect(isPipelineRunning('running')).toBe(true);
      expect(isPipelineRunning('pending')).toBe(true);
    });

    it('should return false for non-running statuses', () => {
      expect(isPipelineRunning('success')).toBe(false);
      expect(isPipelineRunning('failed')).toBe(false);
      expect(isPipelineRunning('canceled')).toBe(false);
    });
  });

  describe('shouldContinuePolling', () => {
    const recentTime = Date.now() - 1000; // 1 second ago
    const oldTime = Date.now() - 15 * 60 * 1000; // 15 minutes ago

    it('should return false for completed status', () => {
      expect(shouldContinuePolling('success', recentTime)).toBe(false);
      expect(shouldContinuePolling('failed', recentTime)).toBe(false);
    });

    it('should return false for timed out execution', () => {
      expect(shouldContinuePolling('running', oldTime)).toBe(false);
    });

    it('should return true for running status within time limit', () => {
      expect(shouldContinuePolling('running', recentTime)).toBe(true);
      expect(shouldContinuePolling('pending', recentTime)).toBe(true);
    });

    it('should return false for unknown status', () => {
      expect(shouldContinuePolling('unknown', recentTime)).toBe(false);
    });
  });

  describe('getPollingInterval', () => {
    it('should return the polling interval constant', () => {
      const interval = getPollingInterval();
      expect(typeof interval).toBe('number');
      expect(interval).toBeGreaterThan(0);
    });
  });
});
