import {
  LibraryConfigFile,
  FileState,
} from 'model/backend/interfaces/sharedInterfaces';
import DigitalTwin from 'model/backend/digitalTwin';
import { Dispatch, SetStateAction } from 'react';
import { useDispatch } from 'react-redux';
import LibraryAsset from 'model/backend/libraryAsset';
import { addOrUpdateLibraryFile } from 'model/store/libraryConfigFiles.slice';
import { updateFileState } from 'util/fileUtils';
import {
  fetchAndSetFileContent,
  fetchAndSetFileLibraryContent,
} from 'route/digitaltwins/editor/sidebarFetchers';

export {
  handleAddFileClick,
  handleCloseFileNameDialog,
  handleFileSubmit,
} from 'route/digitaltwins/editor/sidebarDialogHandlers';

export type AssetOrNull = DigitalTwin | LibraryAsset | null;

export interface FileStateSetters {
  readonly setFileName: Dispatch<SetStateAction<string>>;
  readonly setFileContent: Dispatch<SetStateAction<string>>;
  readonly setFileType: Dispatch<SetStateAction<string>>;
  readonly setFilePrivacy: Dispatch<SetStateAction<string>>;
  readonly setIsLibraryFile: Dispatch<SetStateAction<boolean>>;
  readonly setLibraryAssetPath: Dispatch<SetStateAction<string>>;
}

export interface FileClickContext {
  readonly fileName: string;
  readonly asset: AssetOrNull;
  readonly files: FileState[];
}

interface FileClickOptions {
  readonly dispatch?: ReturnType<typeof useDispatch>;
  readonly library?: boolean;
  readonly libraryFiles?: LibraryConfigFile[];
  readonly assetPath?: string;
}

interface CreateFileOptions {
  readonly dispatch?: ReturnType<typeof useDispatch>;
  readonly libraryFiles?: LibraryConfigFile[];
}

interface ReconfigureOptions {
  readonly dispatch?: ReturnType<typeof useDispatch>;
  readonly library?: boolean;
  readonly libraryFiles?: LibraryConfigFile[];
  readonly assetPath?: string;
}

export const handleFileClick = (
  context: FileClickContext,
  tab: string,
  setters: FileStateSetters,
  options?: FileClickOptions,
) => {
  if (tab === 'create') {
    handleCreateFileClick(context, setters, {
      dispatch: options?.dispatch,
      libraryFiles: options?.libraryFiles,
    });
  } else if (tab === 'reconfigure') {
    handleReconfigureFileClick(context, setters, options);
  }
};

const handleDTCreateFileClick = (
  context: FileClickContext,
  setters: FileStateSetters,
) => {
  const newFile = context.files.find(
    (file) => file.name === context.fileName && file.isNew,
  );
  if (newFile) {
    updateFileState({
      fileName: newFile.name,
      fileContent: newFile.content,
      setFileName: setters.setFileName,
      setFileContent: setters.setFileContent,
      setFileType: setters.setFileType,
      setFilePrivacy: setters.setFilePrivacy,
    });
    setters.setIsLibraryFile(false);
    setters.setLibraryAssetPath('');
  }
};

const handleLibraryCreateFileClick = (
  context: FileClickContext,
  setters: FileStateSetters,
  options?: CreateFileOptions,
) => {
  const asset = context.asset as LibraryAsset;
  const libraryFile = options?.libraryFiles?.find(
    (file) =>
      file.fileName === context.fileName &&
      file.assetPath === asset.path &&
      file.isPrivate === asset.isPrivate,
  );
  if (libraryFile?.isModified) {
    updateFileState({
      fileName: libraryFile.fileName,
      fileContent: libraryFile.fileContent,
      setFileName: setters.setFileName,
      setFileContent: setters.setFileContent,
      setFileType: setters.setFileType,
      setFilePrivacy: setters.setFilePrivacy,
      isPrivate: asset.isPrivate,
    });
    setters.setIsLibraryFile(true);
    setters.setLibraryAssetPath(libraryFile.assetPath);
  } else {
    fetchAndSetFileLibraryContent({
      fileName: context.fileName,
      libraryAsset: asset,
      setFileName: setters.setFileName,
      setFileContent: setters.setFileContent,
      setFileType: setters.setFileType,
      setFilePrivacy: setters.setFilePrivacy,
      isNew: true,
      setIsLibraryFile: setters.setIsLibraryFile,
      setLibraryAssetPath: setters.setLibraryAssetPath,
      dispatch: options?.dispatch,
    });
  }
};

export const handleCreateFileClick = (
  context: FileClickContext,
  setters: FileStateSetters,
  options?: CreateFileOptions,
) => {
  if (context.asset instanceof DigitalTwin || context.asset === null) {
    handleDTCreateFileClick(context, setters);
  } else {
    handleLibraryCreateFileClick(context, setters, options);
  }
};

const handleDTFileReconfigure = (
  context: FileClickContext,
  setters: FileStateSetters,
) => {
  const modifiedFile = context.files.find(
    (file) => file.name === context.fileName && file.isModified && !file.isNew,
  );
  if (modifiedFile) {
    updateFileState({
      fileName: modifiedFile.name,
      fileContent: modifiedFile.content,
      setFileName: setters.setFileName,
      setFileContent: setters.setFileContent,
      setFileType: setters.setFileType,
      setFilePrivacy: setters.setFilePrivacy,
    });
  } else {
    fetchAndSetFileContent(
      {
        fileName: context.fileName,
        digitalTwin: context.asset as DigitalTwin | null,
      },
      {
        setFileName: setters.setFileName,
        setFileContent: setters.setFileContent,
        setFileType: setters.setFileType,
        setFilePrivacy: setters.setFilePrivacy,
      },
    );
  }
  setters.setIsLibraryFile(false);
  setters.setLibraryAssetPath('');
};

const applyModifiedLibraryFile = (
  modifiedFile: LibraryConfigFile,
  setters: FileStateSetters,
  assetPath: string,
) => {
  updateFileState({
    fileName: modifiedFile.fileName,
    fileContent: modifiedFile.fileContent,
    setFileName: setters.setFileName,
    setFileContent: setters.setFileContent,
    setFileType: setters.setFileType,
    setFilePrivacy: setters.setFilePrivacy,
    isPrivate: modifiedFile.isPrivate,
  });
  setters.setIsLibraryFile(true);
  setters.setLibraryAssetPath(assetPath);
};

const fetchLibraryFile = async (
  context: FileClickContext,
  setters: FileStateSetters,
  options: ReconfigureOptions,
) => {
  if (!options.assetPath || !options.dispatch) return;

  try {
    const fileContent = await (
      context.asset as DigitalTwin
    ).DTAssets.getLibraryFileContent(options.assetPath, context.fileName);

    if (fileContent) {
      updateFileState({
        fileName: context.fileName,
        fileContent,
        setFileName: setters.setFileName,
        setFileContent: setters.setFileContent,
        setFileType: setters.setFileType,
        setFilePrivacy: setters.setFilePrivacy,
      });
    }

    options.dispatch(
      addOrUpdateLibraryFile({
        assetPath: options.assetPath,
        fileName: context.fileName,
        fileContent,
        isNew: false,
        isModified: false,
        isPrivate: !options.assetPath.startsWith('common/'),
      }),
    );
    setters.setIsLibraryFile(true);
    setters.setLibraryAssetPath(options.assetPath);
  } catch {
    setters.setFileContent(`Error fetching ${context.fileName} content`);
  }
};

const handleLibraryFileReconfigure = async (
  context: FileClickContext,
  setters: FileStateSetters,
  options: ReconfigureOptions,
) => {
  const modifiedLibraryFile = options.libraryFiles?.find(
    (file) =>
      file.fileName === context.fileName &&
      file.assetPath === options.assetPath,
  );
  if (modifiedLibraryFile?.isModified && options.assetPath) {
    applyModifiedLibraryFile(modifiedLibraryFile, setters, options.assetPath);
  } else {
    await fetchLibraryFile(context, setters, options);
  }
};

const isDigitalTwinAsset = (asset: AssetOrNull): boolean =>
  asset instanceof DigitalTwin || asset === null;

export const handleReconfigureFileClick = async (
  context: FileClickContext,
  setters: FileStateSetters,
  options?: ReconfigureOptions,
) => {
  if (!isDigitalTwinAsset(context.asset)) return;

  if (options?.library) {
    await handleLibraryFileReconfigure(context, setters, options);
  } else {
    handleDTFileReconfigure(context, setters);
  }
};
