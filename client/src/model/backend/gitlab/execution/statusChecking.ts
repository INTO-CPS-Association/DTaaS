import { ExecutionStatus } from 'model/backend/gitlab/types/executionHistory';

/**
 * Maps GitLab pipeline status to internal execution status
 * @param gitlabStatus Status string from GitLab API
 * @returns Internal execution status
 */
export const mapGitlabStatusToExecutionStatus = (
  gitlabStatus: string,
): ExecutionStatus => {
  let executionStatus: ExecutionStatus;
  switch (gitlabStatus.toLowerCase()) {
    case 'success':
      executionStatus = ExecutionStatus.COMPLETED;
      break;
    case 'failed':
      executionStatus = ExecutionStatus.FAILED;
      break;
    case 'running':
    case 'pending':
      executionStatus = ExecutionStatus.RUNNING;
      break;
    case 'canceled':
    case 'cancelled':
      executionStatus = ExecutionStatus.CANCELED;
      break;
    case 'skipped':
      executionStatus = ExecutionStatus.FAILED; // Treat skipped as failed
      break;
    default:
      executionStatus = ExecutionStatus.RUNNING; // Default to running for unknown statuses
  }
  return executionStatus;
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
  let description: string;
  if (!status) {
    description = 'Pipeline status: unknown';
  } else {
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
        break;
    }
  }
  return description;
};

/**
 * Determines the severity level of a status for UI display
 * @param status GitLab pipeline status (can be null/undefined)
 * @returns Severity level ('success', 'error', 'warning', 'info')
 */
export const getStatusSeverity = (
  status: string | null | undefined,
): 'success' | 'error' | 'warning' | 'info' => {
  let severity: 'success' | 'error' | 'warning' | 'info';
  if (isSuccessStatus(status)) {
    severity = 'success';
  } else if (isFailureStatus(status)) {
    severity = 'error';
  } else if (isCanceledStatus(status)) {
    severity = 'warning';
  } else {
    severity = 'info'; // Default to info for running/pending/unknown statuses
  }
  return severity;
};
