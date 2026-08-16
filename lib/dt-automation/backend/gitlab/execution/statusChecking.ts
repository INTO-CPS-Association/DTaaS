import { ExecutionStatus } from 'model/backend/interfaces/execution';

/**
 * Maps GitLab pipeline status to internal execution status
 * @param gitlabStatus Status string from GitLab API
 * @returns Internal execution status
 */
export const mapGitlabStatusToExecutionStatus = (
  gitlabStatus: string,
): ExecutionStatus => {
  let status: ExecutionStatus;
  switch (gitlabStatus.toLowerCase()) {
    case 'success':
      status = ExecutionStatus.COMPLETED;
      break;
    case 'failed':
      status = ExecutionStatus.FAILED;
      break;
    case 'running':
    case 'pending':
      status = ExecutionStatus.RUNNING;
      break;
    case 'canceled':
    case 'cancelled':
      status = ExecutionStatus.CANCELED;
      break;
    case 'skipped':
      status = ExecutionStatus.FAILED; // Treat skipped as failed
      break;
    default:
      status = ExecutionStatus.RUNNING; // Default to running for unknown statuses
  }
  return status;
};

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
export const getStatusDescription = (status: string): string => {
  let description: string;
  switch (status.toLowerCase()) {
    case 'success':
      description = 'Pipeline completed successfully';
      break;
    case 'failed':
      description = 'Pipeline failed';
      break;
    case 'running':
      description = 'Pipeline is running';
      break;
    case 'pending':
      description = 'Pipeline is pending';
      break;
    case 'canceled':
    case 'cancelled':
      description = 'Pipeline was canceled';
      break;
    case 'skipped':
      description = 'Pipeline was skipped';
      break;
    default:
      description = `Pipeline status: ${status}`;
  }
  return description;
};

/**
 * Determines the severity level of a status for UI display
 * @param status GitLab pipeline status
 * @returns Severity level ('success', 'error', 'warning', 'info')
 */
export const getStatusSeverity = (
  status: string,
): 'success' | 'error' | 'warning' | 'info' => {
  if (isSuccessStatus(status)) return 'success';
  if (isFailureStatus(status)) return 'error';
  if (isCanceledStatus(status)) return 'warning';
  return 'info'; // For running, pending, etc.
};
