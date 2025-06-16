import {
  MAX_EXECUTION_TIME,
  PIPELINE_POLL_INTERVAL,
} from 'model/backend/gitlab/constants';

/**
 * Creates a delay promise for polling operations
 * @param ms Milliseconds to delay
 * @returns Promise that resolves after the specified time
 */
export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Checks if a pipeline execution has timed out
 * @param startTime Timestamp when execution started
 * @param maxTime Maximum allowed execution time (optional, defaults to MAX_EXECUTION_TIME)
 * @returns True if execution has timed out
 */
export const hasTimedOut = (
  startTime: number,
  maxTime: number = MAX_EXECUTION_TIME,
): boolean => Date.now() - startTime > maxTime;

/**
 * Determines the appropriate pipeline ID for execution
 * @param executionPipelineId Pipeline ID from execution history (if available)
 * @param fallbackPipelineId Fallback pipeline ID from digital twin
 * @returns The pipeline ID to use
 */
export const determinePipelineId = (
  executionPipelineId?: number,
  fallbackPipelineId?: number,
): number => {
  if (executionPipelineId) return executionPipelineId;
  if (fallbackPipelineId) return fallbackPipelineId;
  throw new Error('No pipeline ID available');
};

/**
 * Determines the child pipeline ID (parent + 1)
 * @param parentPipelineId The parent pipeline ID
 * @returns The child pipeline ID
 */
export const getChildPipelineId = (parentPipelineId: number): number =>
  parentPipelineId + 1;

/**
 * Checks if a pipeline status indicates completion
 * @param status Pipeline status string
 * @returns True if pipeline is completed (success or failed)
 */
export const isPipelineCompleted = (status: string): boolean =>
  status === 'success' || status === 'failed';

/**
 * Checks if a pipeline status indicates it's still running
 * @param status Pipeline status string
 * @returns True if pipeline is still running
 */
export const isPipelineRunning = (status: string): boolean =>
  status === 'running' || status === 'pending';

/**
 * Determines if polling should continue based on status and timeout
 * @param status Current pipeline status
 * @param startTime When polling started
 * @returns True if polling should continue
 */
export const shouldContinuePolling = (
  status: string,
  startTime: number,
): boolean => {
  if (isPipelineCompleted(status)) return false;
  if (hasTimedOut(startTime)) return false;
  return isPipelineRunning(status);
};

/**
 * Gets the default polling interval for pipeline status checks
 * @returns Polling interval in milliseconds
 */
export const getPollingInterval = (): number => PIPELINE_POLL_INTERVAL;
