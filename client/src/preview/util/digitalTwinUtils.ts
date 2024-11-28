/* eslint-disable no-param-reassign */

import DigitalTwin from './digitalTwin';

export function isValidInstance(digitalTwin: DigitalTwin): boolean {
  return !!(
    digitalTwin.gitlabInstance.projectId &&
    digitalTwin.gitlabInstance.triggerToken
  );
}

export function logSuccess(digitalTwin: DigitalTwin, RUNNER_TAG: string): void {
  digitalTwin.gitlabInstance.logs.push({
    status: 'success',
    DTName: digitalTwin.DTName,
    runnerTag: RUNNER_TAG,
  });
  digitalTwin.lastExecutionStatus = 'success';
}

export function logError(
  digitalTwin: DigitalTwin,
  RUNNER_TAG: string,
  error: string,
): void {
  digitalTwin.gitlabInstance.logs.push({
    status: 'error',
    error: new Error(error),
    DTName: digitalTwin.DTName,
    runnerTag: RUNNER_TAG,
  });
  digitalTwin.lastExecutionStatus = 'error';
}
