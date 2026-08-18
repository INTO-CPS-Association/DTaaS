import {
  BackendAPI,
  ProjectId,
  RepositoryTreeItem,
} from 'src/interfaces/backendInterfaces';
import {
  DigitalTwinInterface,
  LibraryConfigFile,
} from 'src/interfaces/sharedInterfaces';
import { Asset } from 'src/Asset';
import { AssetTypes } from 'src/gitlab/digitalTwinConfig/constants';
import { getDTDirectory } from 'src/gitlab/digitalTwinConfig/settingsUtility';
import GitlabInstance from 'src/gitlab/instance';
import { ExecutionStatus } from 'src/interfaces/execution';

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

function getLibraryFileKey(
  fileName: string,
  assetPath: string,
  isPrivate: boolean,
): string {
  return JSON.stringify([fileName, assetPath, isPrivate]);
}

function isModifiedLibraryFile(
  libraryFile: LibraryConfigFile,
  libraryFileKey: string,
): boolean {
  const currentKey = getLibraryFileKey(
    libraryFile.fileName,
    libraryFile.assetPath,
    libraryFile.isPrivate,
  );
  return libraryFile.isModified && currentKey === libraryFileKey;
}

export function getUpdatedLibraryFile(
  fileName: string,
  assetPath: string,
  isPrivate: boolean,
  libraryFiles: LibraryConfigFile[],
): LibraryConfigFile | null {
  const libraryFileKey = getLibraryFileKey(fileName, assetPath, isPrivate);
  return (
    libraryFiles.find((libraryFile) =>
      isModifiedLibraryFile(libraryFile, libraryFileKey),
    ) ?? null
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
