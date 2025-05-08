/* eslint-disable no-param-reassign */

import { LibraryConfigFile } from 'model/backend/gitlab/interfaces';
import { Gitlab } from '@gitbeaker/rest';
import { Asset } from 'preview/components/asset/Asset';
import { AssetTypes, DT_DIRECTORY } from 'model/backend/gitlab/constants';
import DigitalTwin from './digitalTwin';

export function isValidInstance(digitalTwin: DigitalTwin): boolean {
  return !!(digitalTwin.backend.projectId && digitalTwin.backend.triggerToken);
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
  projectId: number,
  api: InstanceType<typeof Gitlab>,
): Promise<Asset[]> {
  const files = await api.Repositories.allRepositoryTrees(projectId, {
    path: DT_DIRECTORY,
    recursive: false,
  });

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
