import { addOrUpdateLibraryFile } from 'preview/store/libraryConfigFiles.slice';
import DigitalTwin from 'preview/util/digitalTwin';
import { updateFileState } from 'preview/util/fileUtils';
import LibraryAsset from 'preview/util/libraryAsset';
import { Dispatch, SetStateAction } from 'react';
import { useDispatch } from 'react-redux';

export const fetchData = async (digitalTwin: DigitalTwin) => {
  await digitalTwin.getDescriptionFiles();
  await digitalTwin.getLifecycleFiles();
  await digitalTwin.getConfigFiles();
  await digitalTwin.getAssetFiles();
};

export const fetchAndSetFileContent = async (
  fileName: string,
  digitalTwin: DigitalTwin | null,
  setFileName: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
  library?: boolean,
  assetPath?: string,
) => {
  try {
    let fileContent;
    if (library) {
      fileContent = await digitalTwin!.DTAssets.getLibraryFileContent(
        assetPath!,
        fileName,
      );
    } else {
      fileContent = await digitalTwin!.DTAssets.getFileContent(fileName);
    }
    if (fileContent) {
      updateFileState(
        fileName,
        fileContent,
        setFileName,
        setFileContent,
        setFileType,
      );
    }
  } catch {
    setFileContent(`Error fetching ${fileName} content`);
  }
};

export const fetchAndSetFileLibraryContent = async (
  fileName: string,
  libraryAsset: LibraryAsset | null,
  setFileName: Dispatch<SetStateAction<string>>,
  setFileContent: Dispatch<SetStateAction<string>>,
  setFileType: Dispatch<SetStateAction<string>>,
  isNew: boolean,
  setIsLibraryFile: Dispatch<SetStateAction<boolean>>,
  setLibraryAssetPath: Dispatch<SetStateAction<string>>,
  dispatch?: ReturnType<typeof useDispatch>,
) => {
  try {
    const fileContent = await libraryAsset!.libraryManager.getFileContent(
      libraryAsset!.isPrivate,
      libraryAsset!.path,
      fileName,
    );

    dispatch!(
      addOrUpdateLibraryFile({
        assetPath: libraryAsset!.path,
        fileName,
        fileContent,
        isNew,
        isModified: false,
      }),
    );
    if (fileContent) {
      updateFileState(
        fileName,
        fileContent,
        setFileName,
        setFileContent,
        setFileType,
      );
    }
    setIsLibraryFile(true);
    setLibraryAssetPath(libraryAsset!.path);
  } catch {
    setFileContent(`Error fetching ${fileName} content`);
  }
};
