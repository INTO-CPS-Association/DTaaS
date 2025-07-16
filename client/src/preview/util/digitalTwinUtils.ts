/* eslint-disable no-param-reassign */

import {
  BackendAPI,
  LibraryConfigFile,
  ProjectId,
} from 'model/backend/gitlab/UtilityInterfaces';
import { Asset } from 'preview/components/asset/Asset';
import { AssetTypes, DT_DIRECTORY } from 'model/backend/gitlab/constants';
import GitlabInstance from 'model/backend/gitlab/instance';
import { ExecutionStatus } from 'model/backend/gitlab/types/executionHistory';
import DigitalTwin from './digitalTwin';

export function isValidInstance(digitalTwin: DigitalTwin): boolean {
  const { backend } = digitalTwin;
  const requiresTriggerToken = backend instanceof GitlabInstance;
  const hasTriggerToken =
    requiresTriggerToken && backend.getTriggerToken() !== null;
  return !requiresTriggerToken || hasTriggerToken;
}

export function logSuccess(digitalTwin: DigitalTwin, RUNNER_TAG: string): void {
  digitalTwin.backend.logs.push({
    status: 'success',
    DTName: digitalTwin.DTName,
    runnerTag: RUNNER_TAG,
  });
  digitalTwin.lastExecutionStatus = ExecutionStatus.SUCCESS;
}

export function logError(
  digitalTwin: DigitalTwin,
  RUNNER_TAG: string,
  error: string,
): void {
  digitalTwin.backend.logs.push({
    status: 'error',
    error: new Error(error),
    DTName: digitalTwin.DTName,
    runnerTag: RUNNER_TAG,
  });
  digitalTwin.lastExecutionStatus = ExecutionStatus.ERROR;
}

export function getUpdatedLibraryFile(
  fileName: string,
  assetPath: string,
  isPrivate: boolean,
  libraryFiles: LibraryConfigFile[],
): LibraryConfigFile | null {
  return (
    libraryFiles.find(
      (libFile) =>
        libFile.fileName === fileName &&
        libFile.assetPath === assetPath &&
        libFile.isPrivate === isPrivate &&
        libFile.isModified,
    ) || null
  );
}

export async function getDTSubfolders(
  projectId: ProjectId,
  api: BackendAPI,
): Promise<Asset[]> {
  const files = await api.listRepositoryFiles(projectId, DT_DIRECTORY);
  const subfolders: Asset[] = await Promise.all(
    files
      .filter((file) => file.type === 'tree' && file.path !== DT_DIRECTORY)
      .map(async (file) => ({
        name: file.name,
        path: file.path,
        type: AssetTypes['Digital Twin' as keyof typeof AssetTypes],
        isPrivate: true,
      })),
  );
  return subfolders;
}
