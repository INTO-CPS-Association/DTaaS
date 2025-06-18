/* eslint-disable no-param-reassign */

import {
  BackendAPI,
  LibraryConfigFile,
  ProjectId,
} from 'model/backend/gitlab/UtilityInterfaces';
import { Asset } from 'preview/components/asset/Asset';
import { AssetTypes, DT_DIRECTORY } from 'model/backend/gitlab/constants';
import GitlabAPI from 'model/backend/gitlab/gitlabAPI';
import DigitalTwin from './digitalTwin';

export function isValidInstance(digitalTwin: DigitalTwin): boolean {
  const { backend } = digitalTwin;
  const requiresTriggerToken = backend.api instanceof GitlabAPI;
  const hasTriggerToken =
    requiresTriggerToken && (backend.api as GitlabAPI).getTriggerToken !== null;
  return !requiresTriggerToken || hasTriggerToken;
}

export function logSuccess(digitalTwin: DigitalTwin, RUNNER_TAG: string): void {
  digitalTwin.backend.logs.push({
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
  digitalTwin.backend.logs.push({
    status: 'error',
    error: new Error(error),
    DTName: digitalTwin.DTName,
    runnerTag: RUNNER_TAG,
  });
  digitalTwin.lastExecutionStatus = 'error';
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
