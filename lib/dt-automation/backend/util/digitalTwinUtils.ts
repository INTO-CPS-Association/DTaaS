import {
  BackendAPI,
  ProjectId,
  RepositoryTreeItem,
} from 'model/backend/interfaces/backendInterfaces';
import {
  DigitalTwinInterface,
  LibraryConfigFile,
} from 'model/backend/interfaces/sharedInterfaces';
import { Asset } from 'model/backend/Asset';
import { AssetTypes } from 'model/backend/gitlab/digitalTwinConfig/constants';
import { getDTDirectory } from 'model/backend/gitlab/digitalTwinConfig/settingsUtility';
import GitlabInstance from 'model/backend/gitlab/instance';
import { ExecutionStatus } from 'model/backend/interfaces/execution';

export function isValidInstance(digitalTwin: DigitalTwinInterface): boolean {
  const { backend } = digitalTwin;
  const requiresTriggerToken = backend instanceof GitlabInstance;
  const hasTriggerToken =
    requiresTriggerToken && backend.getTriggerToken() !== null;
  return !requiresTriggerToken || hasTriggerToken;
}

export function logSuccess(
  digitalTwin: DigitalTwinInterface,
  RUNNER_TAG: string,
): void {
  digitalTwin.backend.logs.push({
    status: 'success',
    DTName: digitalTwin.DTName,
    runnerTag: RUNNER_TAG,
  });

  digitalTwin.lastExecutionStatus = ExecutionStatus.SUCCESS;
}

export function logError(
  digitalTwin: DigitalTwinInterface,
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
  const files = await api.listRepositoryFiles(projectId, getDTDirectory());
  const subfolders: Asset[] = await Promise.all(
    files
      .filter(
        (file: RepositoryTreeItem) =>
          file.type === 'tree' && file.path !== getDTDirectory(),
      )
      .map(async (file: RepositoryTreeItem) => ({
        name: file.name,
        path: file.path,
        type: AssetTypes['Digital Twin' as keyof typeof AssetTypes],
        isPrivate: true,
      })),
  );
  return subfolders;
}
