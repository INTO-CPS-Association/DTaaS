import { JobLog } from 'model/backend/gitlab/types/executionHistory';
import cleanLog from 'model/backend/gitlab/cleanLog';
import { BackendInterface, JobSummary } from '../UtilityInterfaces';

/**
 * Fetches job logs from the backend for a specific pipeline
 * Pure business logic - no UI dependencies
 * @param backend Backend instance with API methods
 * @param pipelineId Pipeline ID to fetch logs for
 * @returns Promise resolving to array of job logs
 */
export const fetchJobLogs = async (
  backend: BackendInterface,
  pipelineId: number,
): Promise<JobLog[]> => {
  const projectId = backend.getProjectId();
  if (!projectId) {
    return [];
  }

  const jobs = await backend.getPipelineJobs(projectId, pipelineId);

  const logPromises = jobs.map((job) => fetchSingleJobLog(backend, job));
  return (await Promise.all(logPromises)).reverse();
};

/**
 * Fetches the log for a single job from the backend.
 * @param backend - An object containing the backend's project ID and a method to fetch the job trace.
 * @param job - The job for which the log should be fetched.
 * @returns A promise that resolves to a `JobLog` object containing the job name and its log content.
 */
export const fetchSingleJobLog = async (
  backend: BackendInterface,
  job: JobSummary,
): Promise<JobLog> => {
  const projectId = backend.getProjectId();
  let result: JobLog;

  if (!projectId || job?.id === undefined) {
    result = {
      jobName: typeof job?.name === 'string' ? job.name : 'Unknown',
      log: job?.id === undefined ? 'Job ID not available' : '',
    };
  } else {
    try {
      let log = await backend.getJobTrace(projectId, job.id);

      if (typeof log === 'string') {
        log = cleanLog(log);
      } else {
        log = '';
      }

      result = {
        jobName: typeof job.name === 'string' ? job.name : 'Unknown',
        log,
      };
    } catch (_e) {
      result = {
        jobName: typeof job.name === 'string' ? job.name : 'Unknown',
        log: 'Error fetching log content',
      };
    }
  }

  return result;
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
export const countSuccessfulJobs = (logs: JobLog[]): number =>
  Array.isArray(logs)
    ? logs.filter(
        (log) =>
          typeof log.log === 'string' && /success|completed/i.test(log.log),
      ).length
    : 0;

/**
 * Counts the number of failed jobs based on log content
 * @param logs Array of job logs to analyze
 * @returns Number of jobs that appear to have failed
 */
export const countFailedJobs = (logs: JobLog[]): number =>
  Array.isArray(logs)
    ? logs.filter(
        (log) => typeof log.log === 'string' && /(error|failed)/i.test(log.log),
      ).length
    : 0;
