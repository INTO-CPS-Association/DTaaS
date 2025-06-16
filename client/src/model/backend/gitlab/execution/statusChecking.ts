import { ExecutionStatus } from 'model/backend/gitlab/types/executionHistory';

/**
 * Maps GitLab pipeline status to internal execution status
 * @param gitlabStatus Status string from GitLab API
 * @returns Internal execution status
 */
export const mapGitlabStatusToExecutionStatus = (
  gitlabStatus: string,
): ExecutionStatus => {
  switch (gitlabStatus.toLowerCase()) {
    case 'success':
      return ExecutionStatus.COMPLETED;
    case 'failed':
      return ExecutionStatus.FAILED;
    case 'running':
    case 'pending':
      return ExecutionStatus.RUNNING;
    case 'canceled':
    case 'cancelled':
      return ExecutionStatus.CANCELED;
    case 'skipped':
      return ExecutionStatus.FAILED; // Treat skipped as failed
    default:
      return ExecutionStatus.RUNNING; // Default to running for unknown statuses
  }
};

/**
 * Determines if a GitLab status indicates success
 * @param status GitLab pipeline status (can be null/undefined)
 * @returns True if status indicates success
 */
export const isSuccessStatus = (status: string | null | undefined): boolean =>
  status?.toLowerCase() === 'success';

/**
 * Determines if a GitLab status indicates failure
 * @param status GitLab pipeline status (can be null/undefined)
 * @returns True if status indicates failure
 */
export const isFailureStatus = (status: string | null | undefined): boolean => {
  if (!status) return false;
  const lowerStatus = status.toLowerCase();
  return lowerStatus === 'failed' || lowerStatus === 'skipped';
};

/**
 * Determines if a GitLab status indicates the pipeline is still running
 * @param status GitLab pipeline status (can be null/undefined)
 * @returns True if status indicates pipeline is running
 */
export const isRunningStatus = (status: string | null | undefined): boolean => {
  if (!status) return false;
  const lowerStatus = status.toLowerCase();
  return lowerStatus === 'running' || lowerStatus === 'pending';
};

/**
 * Determines if a GitLab status indicates the pipeline was canceled
 * @param status GitLab pipeline status (can be null/undefined)
 * @returns True if status indicates cancellation
 */
export const isCanceledStatus = (
  status: string | null | undefined,
): boolean => {
  if (!status) return false;
  const lowerStatus = status.toLowerCase();
  return lowerStatus === 'canceled' || lowerStatus === 'cancelled';
};

/**
 * Determines if a status indicates the pipeline has finished (success or failure)
 * @param status GitLab pipeline status (can be null/undefined)
 * @returns True if pipeline has finished
 */
export const isFinishedStatus = (status: string | null | undefined): boolean =>
  isSuccessStatus(status) ||
  isFailureStatus(status) ||
  isCanceledStatus(status);

/**
 * Gets a human-readable description of the pipeline status
 * @param status GitLab pipeline status (can be null/undefined)
 * @returns Human-readable status description
 */
export const getStatusDescription = (
  status: string | null | undefined,
): string => {
  if (!status) return 'Pipeline status: unknown';

  switch (status.toLowerCase()) {
    case 'success':
      return 'Pipeline completed successfully';
    case 'failed':
      return 'Pipeline failed';
    case 'running':
      return 'Pipeline is running';
    case 'pending':
      return 'Pipeline is pending';
    case 'canceled':
    case 'cancelled':
      return 'Pipeline was canceled';
    case 'skipped':
      return 'Pipeline was skipped';
    default:
      return `Pipeline status: ${status}`;
  }
};

/**
 * Determines the severity level of a status for UI display
 * @param status GitLab pipeline status (can be null/undefined)
 * @returns Severity level ('success', 'error', 'warning', 'info')
 */
export const getStatusSeverity = (
  status: string | null | undefined,
): 'success' | 'error' | 'warning' | 'info' => {
  if (isSuccessStatus(status)) return 'success';
  if (isFailureStatus(status)) return 'error';
  if (isCanceledStatus(status)) return 'warning';
  return 'info'; // For running, pending, etc.
};
