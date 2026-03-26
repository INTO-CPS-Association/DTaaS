import { addOrUpdateLibraryFile } from 'model/store/libraryConfigFiles.slice';
import DigitalTwin from 'model/backend/digitalTwin';
import { updateFileState } from 'util/fileUtils';
import LibraryAsset from 'model/backend/libraryAsset';
import { Dispatch, SetStateAction } from 'react';
import { useDispatch } from 'react-redux';

export interface BasicFileStateSetters {
  readonly setFileName: Dispatch<SetStateAction<string>>;
  readonly setFileContent: Dispatch<SetStateAction<string>>;
  readonly setFileType: Dispatch<SetStateAction<string>>;
  readonly setFilePrivacy: Dispatch<SetStateAction<string>>;
}

export interface FetchFileContext {
  readonly fileName: string;
  readonly digitalTwin: DigitalTwin | null;
  readonly library?: boolean;
  readonly assetPath?: string;
}

export const fetchData = async (digitalTwin: DigitalTwin) => {
  await digitalTwin.getDescriptionFiles();
  await digitalTwin.getLifecycleFiles();
  await digitalTwin.getConfigFiles();
  await digitalTwin.getAssetFiles();
};

const fetchLibraryFileContent = (
  context: FetchFileContext,
): Promise<string> => {
  if (!context.assetPath) {
    throw new Error('Asset path is required for library file fetch');
  }
  return context.digitalTwin!.DTAssets.getLibraryFileContent(
    context.assetPath,
    context.fileName,
  );
};

const fetchFileContent = async (context: FetchFileContext): Promise<string> => {
  if (!context.digitalTwin) {
    throw new Error('Digital twin is not available');
  }
  return context.library
    ? fetchLibraryFileContent(context)
    : context.digitalTwin.DTAssets.getFileContent(context.fileName);
};

export const fetchAndSetFileContent = async (
  context: FetchFileContext,
  setters: BasicFileStateSetters,
) => {
  try {
    const fileContent = await fetchFileContent(context);
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
  } catch {
    setters.setFileContent(`Error fetching ${context.fileName} content`);
  }
};

interface LibraryFileParams {
  readonly fileName: string;
  readonly libraryAsset: LibraryAsset | null;
  readonly setFileName: Dispatch<SetStateAction<string>>;
  readonly setFileContent: Dispatch<SetStateAction<string>>;
  readonly setFileType: Dispatch<SetStateAction<string>>;
  readonly setFilePrivacy: Dispatch<SetStateAction<string>>;
  readonly isNew: boolean;
  readonly setIsLibraryFile: Dispatch<SetStateAction<boolean>>;
  readonly setLibraryAssetPath: Dispatch<SetStateAction<string>>;
  readonly dispatch?: ReturnType<typeof useDispatch>;
}

export const fetchAndSetFileLibraryContent = async (
  params: LibraryFileParams,
) => {
  if (!params.libraryAsset || !params.dispatch) {
    params.setFileContent(`Error fetching ${params.fileName} content`);
    return;
  }
  const { libraryAsset } = params;
  try {
    const fileContent = await libraryAsset.libraryManager.getFileContent(
      libraryAsset.isPrivate,
      libraryAsset.path,
      params.fileName,
    );

    params.dispatch(
      addOrUpdateLibraryFile({
        assetPath: libraryAsset.path,
        fileName: params.fileName,
        fileContent,
        isNew: params.isNew,
        isModified: false,
        isPrivate: libraryAsset.isPrivate,
      }),
    );
    if (fileContent) {
      updateFileState({
        fileName: params.fileName,
        fileContent,
        setFileName: params.setFileName,
        setFileContent: params.setFileContent,
        setFileType: params.setFileType,
        setFilePrivacy: params.setFilePrivacy,
      });
    }
    params.setIsLibraryFile(true);
    params.setLibraryAssetPath(libraryAsset.path);
  } catch {
    params.setFileContent(`Error fetching ${params.fileName} content`);
  }
};
