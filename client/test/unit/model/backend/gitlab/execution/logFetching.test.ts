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
import { JobLog } from 'model/backend/gitlab/types/executionHistory';

describe('logFetching', () => {
  const mockGitlabInstance = {
    projectId: 123,
    getPipelineJobs: jest.fn(),
    getJobTrace: jest.fn(),
  };

  const mockJobs = [
    { id: 1, name: 'job1' },
    { id: 2, name: 'job2' },
  ];

  const mockJobLogs: JobLog[] = [
    { jobName: 'job1', log: 'Success: Job completed' },
    { jobName: 'job2', log: 'Error: Job failed' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchJobLogs', () => {
    it('should fetch job logs successfully', async () => {
      mockGitlabInstance.getPipelineJobs.mockResolvedValue(mockJobs);
      mockGitlabInstance.getJobTrace
        .mockResolvedValueOnce('Success: Job completed')
        .mockResolvedValueOnce('Error: Job failed');

      const result = await fetchJobLogs(mockGitlabInstance, 456);

      expect(result).toHaveLength(2);
      expect(result[0].jobName).toBe('job2');
      expect(result[1].jobName).toBe('job1');
      expect(mockGitlabInstance.getPipelineJobs).toHaveBeenCalledWith(123, 456);
    });

    it('should return empty array when projectId is null', async () => {
      const instanceWithoutProject = { ...mockGitlabInstance, projectId: null };
      const result = await fetchJobLogs(instanceWithoutProject, 456);
      expect(result).toEqual([]);
    });

    it('should handle jobs without id', async () => {
      mockGitlabInstance.getPipelineJobs.mockResolvedValue([{ name: 'job1' }]);
      const result = await fetchJobLogs(mockGitlabInstance, 456);
      expect(result[0].log).toBe('Job ID not available');
    });

    it('should handle trace fetch errors', async () => {
      mockGitlabInstance.getPipelineJobs.mockResolvedValue(mockJobs);
      mockGitlabInstance.getJobTrace.mockRejectedValue(new Error('API Error'));

      const result = await fetchJobLogs(mockGitlabInstance, 456);
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
