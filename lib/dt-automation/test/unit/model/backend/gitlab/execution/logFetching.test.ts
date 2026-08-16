import {
  fetchJobLogs,
  validateLogs,
  filterValidLogs,
  combineLogs,
  extractJobNames,
  findJobLog,
  countSuccessfulJobs,
  countFailedJobs,
} from 'model/backend/gitlab/execution/logFetching';
import { JobLog } from 'model/backend/interfaces/execution';
import { mockBackendInstance } from 'test/__mocks__/global_mocks';

describe('logFetching', () => {
  const mockJobs = [
    { id: 1, name: 'job1' },
    { id: 2, name: 'job2' },
  ];

  const mockJobLogs: JobLog[] = [
    { jobName: 'job1', log: 'Success: Job completed' },
    { jobName: 'job2', log: 'Error: Job failed' },
  ];

  beforeEach(() => {
    (mockBackendInstance.getProjectId as jest.Mock).mockReturnValue(123);
  });

  describe('fetchJobLogs', () => {
    it('should fetch job logs successfully', async () => {
      (mockBackendInstance.getPipelineJobs as jest.Mock).mockResolvedValue(
        mockJobs,
      );
      (mockBackendInstance.getJobTrace as jest.Mock)
        .mockResolvedValueOnce('Success: Job completed')
        .mockResolvedValueOnce('Error: Job failed');

      const result = await fetchJobLogs(mockBackendInstance, 456);

      expect(result).toHaveLength(2);
      expect(result[0].jobName).toBe('job2');
      expect(result[1].jobName).toBe('job1');
      expect(mockBackendInstance.getPipelineJobs).toHaveBeenCalledWith(
        123,
        456,
      );
    });

    it('should handle jobs without id', async () => {
      (mockBackendInstance.getPipelineJobs as jest.Mock).mockResolvedValue([
        { name: 'job1' },
      ]);
      const result = await fetchJobLogs(mockBackendInstance, 456);
      expect(result[0].log).toBe('Job ID not available');
    });

    it('should handle trace fetch errors', async () => {
      (mockBackendInstance.getPipelineJobs as jest.Mock).mockResolvedValue(
        mockJobs,
      );
      (mockBackendInstance.getJobTrace as jest.Mock).mockRejectedValue(
        new Error('API Error'),
      );

      const result = await fetchJobLogs(mockBackendInstance, 456);
      expect(result[0].log).toBe('Error fetching log content');
    });
  });

  describe('validateLogs', () => {
    it('should return true for valid logs', () => {
      expect(validateLogs(mockJobLogs)).toBe(true);
    });

    it('should return false for empty logs', () => {
      expect(validateLogs([])).toBe(false);
      expect(validateLogs([{ jobName: 'test', log: '' }])).toBe(false);
    });
  });

  describe('filterValidLogs', () => {
    it('should filter out empty logs', () => {
      const logsWithEmpty = [
        ...mockJobLogs,
        { jobName: 'empty', log: '' },
        { jobName: 'whitespace', log: '   ' },
      ];
      const result = filterValidLogs(logsWithEmpty);
      expect(result).toHaveLength(2);
    });
  });

  describe('combineLogs', () => {
    it('should combine logs with default separator', () => {
      const result = combineLogs(mockJobLogs);
      expect(result).toContain('[job1]');
      expect(result).toContain('[job2]');
      expect(result).toContain('\n---\n');
    });

    it('should use custom separator', () => {
      const result = combineLogs(mockJobLogs, ' | ');
      expect(result).toContain(' | ');
    });
  });

  describe('extractJobNames', () => {
    it('should extract job names', () => {
      const result = extractJobNames(mockJobLogs);
      expect(result).toEqual(['job1', 'job2']);
    });
  });

  describe('findJobLog', () => {
    it('should find job by name', () => {
      const result = findJobLog(mockJobLogs, 'job1');
      expect(result?.jobName).toBe('job1');
    });

    it('should return undefined for non-existent job', () => {
      const result = findJobLog(mockJobLogs, 'nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('countSuccessfulJobs', () => {
    it('should count successful jobs', () => {
      const result = countSuccessfulJobs(mockJobLogs);
      expect(result).toBe(1);
    });
  });

  describe('countFailedJobs', () => {
    it('should count failed jobs', () => {
      const result = countFailedJobs(mockJobLogs);
      expect(result).toBe(1);
    });
  });
});
