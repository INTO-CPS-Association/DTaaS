import {
  mapGitlabStatusToExecutionStatus,
  isSuccessStatus,
  isFailureStatus,
  isRunningStatus,
  isCanceledStatus,
  isFinishedStatus,
  getStatusDescription,
  getStatusSeverity,
} from 'model/backend/gitlab/execution/statusChecking';
import { ExecutionStatus } from 'model/backend/interfaces/execution';

describe('statusChecking', () => {
  describe('mapGitlabStatusToExecutionStatus', () => {
    it('should map success status', () => {
      expect(mapGitlabStatusToExecutionStatus('success')).toBe(
        ExecutionStatus.COMPLETED,
      );
      expect(mapGitlabStatusToExecutionStatus('SUCCESS')).toBe(
        ExecutionStatus.COMPLETED,
      );
    });

    it('should map failed status', () => {
      expect(mapGitlabStatusToExecutionStatus('failed')).toBe(
        ExecutionStatus.FAILED,
      );
      expect(mapGitlabStatusToExecutionStatus('FAILED')).toBe(
        ExecutionStatus.FAILED,
      );
    });

    it('should map running statuses', () => {
      expect(mapGitlabStatusToExecutionStatus('running')).toBe(
        ExecutionStatus.RUNNING,
      );
      expect(mapGitlabStatusToExecutionStatus('pending')).toBe(
        ExecutionStatus.RUNNING,
      );
    });

    it('should map canceled statuses', () => {
      expect(mapGitlabStatusToExecutionStatus('canceled')).toBe(
        ExecutionStatus.CANCELED,
      );
      expect(mapGitlabStatusToExecutionStatus('cancelled')).toBe(
        ExecutionStatus.CANCELED,
      );
    });

    it('should map skipped as failed', () => {
      expect(mapGitlabStatusToExecutionStatus('skipped')).toBe(
        ExecutionStatus.FAILED,
      );
    });

    it('should default unknown statuses to running', () => {
      expect(mapGitlabStatusToExecutionStatus('unknown')).toBe(
        ExecutionStatus.RUNNING,
      );
      expect(mapGitlabStatusToExecutionStatus('created')).toBe(
        ExecutionStatus.RUNNING,
      );
    });
  });

  describe('isSuccessStatus', () => {
    it('should return true for success status', () => {
      expect(isSuccessStatus('success')).toBe(true);
      expect(isSuccessStatus('SUCCESS')).toBe(true);
    });

    it('should return false for non-success statuses', () => {
      expect(isSuccessStatus('failed')).toBe(false);
      expect(isSuccessStatus('running')).toBe(false);
      expect(isSuccessStatus('pending')).toBe(false);
    });
  });

  describe('isFailureStatus', () => {
    it('should return true for failure statuses', () => {
      expect(isFailureStatus('failed')).toBe(true);
      expect(isFailureStatus('FAILED')).toBe(true);
      expect(isFailureStatus('skipped')).toBe(true);
      expect(isFailureStatus('SKIPPED')).toBe(true);
    });

    it('should return false for non-failure statuses', () => {
      expect(isFailureStatus('success')).toBe(false);
      expect(isFailureStatus('running')).toBe(false);
      expect(isFailureStatus('canceled')).toBe(false);
    });
  });

  describe('isRunningStatus', () => {
    it('should return true for running statuses', () => {
      expect(isRunningStatus('running')).toBe(true);
      expect(isRunningStatus('RUNNING')).toBe(true);
      expect(isRunningStatus('pending')).toBe(true);
      expect(isRunningStatus('PENDING')).toBe(true);
    });

    it('should return false for non-running statuses', () => {
      expect(isRunningStatus('success')).toBe(false);
      expect(isRunningStatus('failed')).toBe(false);
      expect(isRunningStatus('canceled')).toBe(false);
    });
  });

  describe('isCanceledStatus', () => {
    it('should return true for canceled statuses', () => {
      expect(isCanceledStatus('canceled')).toBe(true);
      expect(isCanceledStatus('CANCELED')).toBe(true);
      expect(isCanceledStatus('cancelled')).toBe(true);
      expect(isCanceledStatus('CANCELLED')).toBe(true);
    });

    it('should return false for non-canceled statuses', () => {
      expect(isCanceledStatus('success')).toBe(false);
      expect(isCanceledStatus('failed')).toBe(false);
      expect(isCanceledStatus('running')).toBe(false);
    });
  });

  describe('isFinishedStatus', () => {
    it('should return true for finished statuses', () => {
      expect(isFinishedStatus('success')).toBe(true);
      expect(isFinishedStatus('failed')).toBe(true);
      expect(isFinishedStatus('canceled')).toBe(true);
      expect(isFinishedStatus('cancelled')).toBe(true);
      expect(isFinishedStatus('skipped')).toBe(true);
    });

    it('should return false for non-finished statuses', () => {
      expect(isFinishedStatus('running')).toBe(false);
      expect(isFinishedStatus('pending')).toBe(false);
      expect(isFinishedStatus('unknown')).toBe(false);
    });
  });

  describe('getStatusDescription', () => {
    it('should return correct descriptions', () => {
      expect(getStatusDescription('success')).toBe(
        'Pipeline completed successfully',
      );
      expect(getStatusDescription('failed')).toBe('Pipeline failed');
      expect(getStatusDescription('running')).toBe('Pipeline is running');
      expect(getStatusDescription('pending')).toBe('Pipeline is pending');
      expect(getStatusDescription('canceled')).toBe('Pipeline was canceled');
      expect(getStatusDescription('cancelled')).toBe('Pipeline was canceled');
      expect(getStatusDescription('skipped')).toBe('Pipeline was skipped');
      expect(getStatusDescription('unknown')).toBe('Pipeline status: unknown');
    });
  });

  describe('getStatusSeverity', () => {
    it('should return correct severity levels', () => {
      expect(getStatusSeverity('success')).toBe('success');
      expect(getStatusSeverity('failed')).toBe('error');
      expect(getStatusSeverity('skipped')).toBe('error');
      expect(getStatusSeverity('canceled')).toBe('warning');
      expect(getStatusSeverity('cancelled')).toBe('warning');
      expect(getStatusSeverity('running')).toBe('info');
      expect(getStatusSeverity('pending')).toBe('info');
      expect(getStatusSeverity('unknown')).toBe('info');
    });
  });
});
