import { JobLog } from 'model/backend/gitlab/types/executionHistory';
import cleanLog from 'model/backend/gitlab/cleanLog';

interface GitLabJob {
  id?: number;
  name?: string;
  [key: string]: unknown;
}

/**
 * Fetches job logs from GitLab for a specific pipeline
 * Pure business logic - no UI dependencies
 * @param gitlabInstance GitLab instance with API methods
 * @param pipelineId Pipeline ID to fetch logs for
 * @returns Promise resolving to array of job logs
 */
export const fetchJobLogs = async (
  gitlabInstance: {
    projectId?: number | null;
    getPipelineJobs: (
      projectId: number,
      pipelineId: number,
    ) => Promise<unknown[]>;
    getJobTrace: (projectId: number, jobId: number) => Promise<string>;
  },
  pipelineId: number,
): Promise<JobLog[]> => {
  const { projectId } = gitlabInstance;
  if (!projectId) {
    return [];
  }

  const rawJobs = await gitlabInstance.getPipelineJobs(projectId, pipelineId);
  const jobs: GitLabJob[] = rawJobs.map((job) => job as GitLabJob);

  const logPromises = jobs.map(async (job) => {
    if (!job || typeof job.id === 'undefined') {
      return { jobName: 'Unknown', log: 'Job ID not available' };
    }

    try {
      let log = await gitlabInstance.getJobTrace(projectId, job.id);

      if (typeof log === 'string') {
        log = cleanLog(log);
      } else {
        log = '';
      }

      return {
        jobName: typeof job.name === 'string' ? job.name : 'Unknown',
        log,
      };
    } catch (_e) {
      return {
        jobName: typeof job.name === 'string' ? job.name : 'Unknown',
        log: 'Error fetching log content',
      };
    }
  });
  return (await Promise.all(logPromises)).reverse();
};

/**
 * Validates if job logs contain meaningful content
 * @param logs Array of job logs to validate
 * @returns True if logs contain meaningful content
 */
export const validateLogs = (logs: JobLog[]): boolean => {
  if (!logs || logs.length === 0) return false;

  return !logs.every((log) => !log.log || log.log.trim() === '');
};

/**
 * Filters out empty or invalid job logs
 * @param logs Array of job logs to filter
 * @returns Filtered array of valid job logs
 */
export const filterValidLogs = (logs: JobLog[]): JobLog[] => {
  if (!logs) return [];

  return logs.filter((log) => log.log && log.log.trim() !== '');
};

/**
 * Combines multiple job logs into a single log entry
 * @param logs Array of job logs to combine
 * @param separator Separator between logs (default: '\n---\n')
 * @returns Combined log string
 */
export const combineLogs = (
  logs: JobLog[],
  separator: string = '\n---\n',
): string => {
  if (!logs || logs.length === 0) return '';

  return logs
    .filter((log) => log.log && log.log.trim() !== '')
    .map((log) => `[${log.jobName}]\n${log.log}`)
    .join(separator);
};

/**
 * Extracts job names from job logs
 * @param logs Array of job logs
 * @returns Array of job names
 */
export const extractJobNames = (logs: JobLog[]): string[] => {
  if (!logs) return [];

  return logs.map((log) => log.jobName).filter(Boolean);
};

/**
 * Finds a specific job log by job name
 * @param logs Array of job logs to search
 * @param jobName Name of the job to find
 * @returns The job log if found, undefined otherwise
 */
export const findJobLog = (
  logs: JobLog[],
  jobName: string,
): JobLog | undefined => {
  if (!logs || !jobName) return undefined;

  return logs.find((log) => log.jobName === jobName);
};

/**
 * Counts the number of successful jobs based on log content
 * @param logs Array of job logs to analyze
 * @returns Number of jobs that appear to have succeeded
 */
export const countSuccessfulJobs = (logs: JobLog[]): number => {
  if (!logs) return 0;

  return logs.filter((log) => {
    if (!log.log) return false;
    const logContent = log.log.toLowerCase();
    return logContent.includes('success') || logContent.includes('completed');
  }).length;
};

/**
 * Counts the number of failed jobs based on log content
 * @param logs Array of job logs to analyze
 * @returns Number of jobs that appear to have failed
 */
export const countFailedJobs = (logs: JobLog[]): number => {
  if (!logs) return 0;

  return logs.filter((log) => {
    if (!log.log) return false;
    const logContent = log.log.toLowerCase();
    return logContent.includes('error') || logContent.includes('failed');
  }).length;
};
