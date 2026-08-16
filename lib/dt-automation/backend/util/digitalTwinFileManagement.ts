import type DigitalTwin from 'model/backend/digitalTwin';
import {
  FileState,
  FileType,
  LibraryAssetInterface,
  LibraryConfigFile,
} from 'model/backend/interfaces/sharedInterfaces';
import { getUpdatedLibraryFile } from 'model/backend/util/digitalTwinUtils';
import {
  getBranchName,
  getDTDirectory,
} from 'model/backend/gitlab/digitalTwinConfig/settingsUtility';

type FolderEntry = { assetPath: string; fileNames: string[] };

const processSubFolders = async (
  self: DigitalTwin,
  folder: string,
): Promise<FolderEntry[]> => {
  const subFolders = await self.DTAssets.getFolders(folder);
  const subFolderPromises = subFolders.map(async (subFolder) => {
    const fileNames = await self.DTAssets.getLibraryConfigFileNames(subFolder);
    return { assetPath: subFolder, fileNames };
  });
  return Promise.all(subFolderPromises);
};

const processFolderEntries = async (
  self: DigitalTwin,
  folder: string,
): Promise<FolderEntry[]> => {
  if (folder.endsWith('/common')) {
    return processSubFolders(self, folder);
  }
  const fileNames = await self.DTAssets.getLibraryConfigFileNames(folder);
  return [{ assetPath: folder, fileNames }];
};

export async function getAssetFilesFn(
  self: DigitalTwin,
): Promise<{ assetPath: string; fileNames: string[] }[]> {
  const mainFolderPath = `${getDTDirectory()}/${self.DTName}`;
  const excludeFolder = FileType.LIFECYCLE;
  const result: { assetPath: string; fileNames: string[] }[] = [];

  try {
    const folders = await self.DTAssets.getFolders(mainFolderPath);

    const validFolders = folders.filter(
      (folder) => !folder.includes(excludeFolder),
    );

    const folderPromises = validFolders.map((folder) =>
      processFolderEntries(self, folder),
    );

    const nestedResults = await Promise.all(folderPromises);
    result.push(...nestedResults.flat());

    self.assetFiles = result;
  } catch {
    return [];
  }
  return result;
}

export async function prepareAllAssetFilesFn(
  self: DigitalTwin,
  cartAssets: LibraryAssetInterface[],
  libraryFiles: LibraryConfigFile[],
): Promise<
  Array<{
    name: string;
    content: string;
    isNew: boolean;
    isFromCommonLibrary: boolean;
  }>
> {
  const assetPromises = cartAssets.map(async (asset) => {
    const assetFiles = await self.DTAssets.getFilesFromAsset(
      asset.path,
      asset.isPrivate,
    );

    return assetFiles.map((assetFile) => {
      const updatedFile = getUpdatedLibraryFile(
        assetFile.name,
        asset.path,
        asset.isPrivate,
        libraryFiles,
      );

      return {
        name: `${asset.name}/${assetFile.name}`,
        content: updatedFile ? updatedFile.fileContent : assetFile.content,
        isNew: true,
        isFromCommonLibrary: !asset.isPrivate,
      };
    });
  });

  const nestedFiles = await Promise.all(assetPromises);
  return nestedFiles.flat();
}

export async function createDT(
  self: DigitalTwin,
  files: FileState[],
  cartAssets: LibraryAssetInterface[],
  libraryFiles: LibraryConfigFile[],
): Promise<string> {
  const mainFolderPath = `${getDTDirectory()}/${self.DTName}`;
  const lifecycleFolderPath = `${mainFolderPath}/lifecycle`;

  try {
    if (!self.backend.getProjectId()) {
      throw new Error('Create failed');
    }

    const assetFilesToCreate = await prepareAllAssetFilesFn(
      self,
      cartAssets,
      libraryFiles,
    );

    const fileActions = self.DTAssets.buildCreateFileActions(
      files,
      mainFolderPath,
      lifecycleFolderPath,
    );

    const assetActions = self.DTAssets.buildCreateFileActions(
      assetFilesToCreate,
      mainFolderPath,
      lifecycleFolderPath,
    );

    const triggerAction = await self.DTAssets.buildTriggerAction();

    const allActions = [
      ...fileActions,
      ...assetActions,
      ...(triggerAction ? [triggerAction] : []),
    ];

    if (allActions.length > 0) {
      await self.backend.api.commitMultipleActions(
        self.backend.getProjectId(),
        getBranchName(),
        `Create ${self.DTName} digital twin`,
        allActions,
      );
    }

    return `${self.DTName} digital twin files initialized successfully.`;
  } catch (error) {
    return `Error initializing ${self.DTName} digital twin files: ${String(error)}`;
  }
}
