import { ExecutionStatus } from 'src/interfaces/execution';

type StatusSeverity = 'success' | 'error' | 'warning' | 'info';

const EXECUTION_STATUSES: Record<string, ExecutionStatus> = {
  success: ExecutionStatus.COMPLETED,
  failed: ExecutionStatus.FAILED,
  running: ExecutionStatus.RUNNING,
  pending: ExecutionStatus.RUNNING,
  canceled: ExecutionStatus.CANCELED,
  cancelled: ExecutionStatus.CANCELED,
  skipped: ExecutionStatus.FAILED,
};

const STATUS_DESCRIPTIONS: Record<string, string> = {
  success: 'Pipeline completed successfully',
  failed: 'Pipeline failed',
  running: 'Pipeline is running',
  pending: 'Pipeline is pending',
  canceled: 'Pipeline was canceled',
  cancelled: 'Pipeline was canceled',
  skipped: 'Pipeline was skipped',
};

const STATUS_SEVERITIES: Record<string, StatusSeverity> = {
  success: 'success',
  failed: 'error',
  skipped: 'error',
  canceled: 'warning',
  cancelled: 'warning',
};

/**
 * Maps GitLab pipeline status to internal execution status
 * @param gitlabStatus Status string from GitLab API
 * @returns Internal execution status
 */
export const mapGitlabStatusToExecutionStatus = (
  gitlabStatus: string,
): ExecutionStatus =>
  EXECUTION_STATUSES[gitlabStatus.toLowerCase()] ?? ExecutionStatus.RUNNING;

/**
 * Determines if a GitLab status indicates success
 * @param status GitLab pipeline status
 * @returns True if status indicates success
 */
export const isSuccessStatus = (status: string): boolean =>
  status.toLowerCase() === 'success';

/**
 * Determines if a GitLab status indicates failure
 * @param status GitLab pipeline status
 * @returns True if status indicates failure
 */
export const isFailureStatus = (status: string): boolean => {
  const lowerStatus = status.toLowerCase();
  return lowerStatus === 'failed' || lowerStatus === 'skipped';
};

/**
 * Determines if a GitLab status indicates the pipeline is still running
 * @param status GitLab pipeline status
 * @returns True if status indicates pipeline is running
 */
export const isRunningStatus = (status: string): boolean => {
  const lowerStatus = status.toLowerCase();
  return lowerStatus === 'running' || lowerStatus === 'pending';
};

/**
 * Determines if a GitLab status indicates the pipeline was canceled
 * @param status GitLab pipeline status
 * @returns True if status indicates cancellation
 */
export const isCanceledStatus = (status: string): boolean => {
  const lowerStatus = status.toLowerCase();
  return lowerStatus === 'canceled' || lowerStatus === 'cancelled';
};

/**
 * Determines if a status indicates the pipeline has finished (success or failure)
 * @param status GitLab pipeline status
 * @returns True if pipeline has finished
 */
export const isFinishedStatus = (status: string): boolean =>
  isSuccessStatus(status) ||
  isFailureStatus(status) ||
  isCanceledStatus(status);

/**
 * Gets a human-readable description of the pipeline status
 * @param status GitLab pipeline status
 * @returns Human-readable status description
 */
export const getStatusDescription = (status: string): string =>
  STATUS_DESCRIPTIONS[status.toLowerCase()] ?? `Pipeline status: ${status}`;

/**
 * Determines the severity level of a status for UI display
 * @param status GitLab pipeline status
 * @returns Severity level ('success', 'error', 'warning', 'info')
 */
export const getStatusSeverity = (status: string): StatusSeverity =>
  STATUS_SEVERITIES[status.toLowerCase()] ?? 'info';
