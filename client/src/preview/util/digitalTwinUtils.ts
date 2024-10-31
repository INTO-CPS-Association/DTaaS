/* eslint-disable no-param-reassign */

import { FileState } from 'preview/store/file.slice';
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

export function getFilePath(
  file: FileState,
  mainFolderPath: string,
  lifecycleFolderPath: string,
): string {
  return file.type === 'lifecycle' ? lifecycleFolderPath : mainFolderPath;
}

export function getCommitMessage(file: FileState): string {
  return `Add ${file.name} to ${file.type === 'lifecycle' ? 'lifecycle' : 'digital twin'} folder`;
}

export async function createFile(
  digitalTwin: DigitalTwin,
  file: FileState,
  filePath: string,
  commitMessage: string,
): Promise<void> {
  await digitalTwin.gitlabInstance.api.RepositoryFiles.create(
    digitalTwin.gitlabInstance.projectId!,
    `${filePath}/${file.name}`,
    'main',
    file.content,
    commitMessage,
  );
}
