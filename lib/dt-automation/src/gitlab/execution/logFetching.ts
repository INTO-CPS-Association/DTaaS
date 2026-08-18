import { JobLog } from 'src/interfaces/execution';
import cleanLog from 'src/gitlab/cleanLog';
import {
  BackendInterface,
  JobSummary,
  ProjectId,
} from 'src/interfaces/backendInterfaces';

const jobLog = (jobName: string, log: string): JobLog => ({ jobName, log });
type JobLogSource = Partial<Pick<JobSummary, 'id' | 'name'>>;

function getJobName(name: unknown): string {
  return typeof name === 'string' ? name : 'Unknown';
}

function cleanJobTrace(
  trace: unknown,
  cleanLogFn: (log: string) => string,
): string {
  return typeof trace === 'string' ? cleanLogFn(trace) : '';
}

async function fetchJobTrace(
  backend: BackendInterface,
  projectId: ProjectId,
  jobId: number,
  cleanLogFn: (log: string) => string,
): Promise<string> {
  try {
    return cleanJobTrace(
      await backend.getJobTrace(projectId, jobId),
      cleanLogFn,
    );
  } catch {
    return 'Error fetching log content';
  }
}

async function fetchJobLog(
  backend: BackendInterface,
  projectId: ProjectId,
  job: JobLogSource,
  cleanLogFn: (log: string) => string,
): Promise<JobLog> {
  const jobName = getJobName(job.name);
  if (job.id === undefined) return jobLog('Unknown', 'Job ID not available');

  const trace = await fetchJobTrace(backend, projectId, job.id, cleanLogFn);
  return jobLog(jobName, trace);
}

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
  cleanLogFn: (log: string) => string = cleanLog,
): Promise<JobLog[]> => {
  const projectId = backend.getProjectId();
  const jobs = await backend.getPipelineJobs(projectId, pipelineId);
  const jobLogs = await Promise.all(
    jobs.map((job) => fetchJobLog(backend, projectId, job, cleanLogFn)),
  );
  return jobLogs.reverse();
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
function logIncludesAny(log: string | undefined, terms: readonly string[]) {
  const normalizedLog = log?.toLowerCase() ?? '';
  return terms.some((term) => normalizedLog.includes(term));
}

function countJobsWithTerms(logs: JobLog[], terms: readonly string[]): number {
  return (logs ?? []).filter((log) => logIncludesAny(log.log, terms)).length;
}

export const countSuccessfulJobs = (logs: JobLog[]): number =>
  countJobsWithTerms(logs, ['success', 'completed']);

/**
 * Counts the number of failed jobs based on log content
 * @param logs Array of job logs to analyze
 * @returns Number of jobs that appear to have failed
 */
export const countFailedJobs = (logs: JobLog[]): number =>
  countJobsWithTerms(logs, ['error', 'failed']);
