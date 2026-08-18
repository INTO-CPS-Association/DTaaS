import type { Dispatch as ReduxDispatch } from '@reduxjs/toolkit';
import { AssetTypes } from 'src/gitlab/digitalTwinConfig/constants';
import getAuthority from 'src/util/env';
import { extractDataFromDigitalTwin } from 'src/util/digitalTwinAdapter';
import { setDigitalTwin } from 'src/state/digitalTwin.slice';
import DigitalTwin from 'src/digitalTwin';
import { setAsset } from 'src/store/assets.slice';
import LibraryAsset, { getLibrarySubfolders } from 'src/libraryAsset';
import { getDTSubfolders } from 'src/util/digitalTwinUtils';
import { createGitlabInstance } from 'src/gitlab/gitlabFactory';
import LibraryManager from 'src/libraryManager';

type ErrorSetter = (message: string | null) => void;

async function createInitializedInstance() {
  const instance = createGitlabInstance(
    sessionStorage.getItem('username') || '',
    sessionStorage.getItem('access_token') || '',
    getAuthority(),
  );
  await instance.init();
  return instance;
}

async function loadLibraryAssets(type: string, isPrivate: boolean) {
  const instance = await createInitializedInstance();
  const subfolders = await getLibrarySubfolders(
    instance.getProjectId(),
    type as keyof typeof AssetTypes,
    instance,
  );
  return Promise.all(
    subfolders.map(async (subfolder) => {
      const libraryManager = new LibraryManager(subfolder.name, instance);
      const libraryAsset = new LibraryAsset(
        libraryManager,
        subfolder.path,
        isPrivate,
        type,
      );
      await libraryAsset.getDescription();
      return libraryAsset;
    }),
  );
}

async function loadDigitalTwins() {
  const instance = await createInitializedInstance();
  const subfolders = await getDTSubfolders(
    instance.getProjectId(),
    instance.api,
  );
  const dtInstance = await createInitializedInstance();
  return Promise.all(
    subfolders.map(async (asset) => {
      const digitalTwin = new DigitalTwin(asset.name, dtInstance);
      await digitalTwin.initialize();
      return { assetName: asset.name, digitalTwin };
    }),
  );
}

export const fetchLibraryAssets = async (
  dispatch: ReduxDispatch,
  setError: ErrorSetter,
  type: string,
  isPrivate: boolean,
) => {
  try {
    const assets = await loadLibraryAssets(type, isPrivate);

    for (const asset of assets) {
      dispatch(setAsset(asset));
    }
  } catch (err) {
    setError(`An error occurred while fetching assets: ${err}`);
  }
};

export const fetchDigitalTwins = async (
  dispatch: ReduxDispatch,
  setError: ErrorSetter,
) => {
  try {
    await fetchLibraryAssets(dispatch, setError, 'Digital Twins', true);
    const digitalTwins = await loadDigitalTwins();

    for (const { assetName, digitalTwin } of digitalTwins) {
      const digitalTwinData = extractDataFromDigitalTwin(digitalTwin);
      dispatch(setDigitalTwin({ assetName, digitalTwin: digitalTwinData }));
    }
  } catch (err) {
    setError(`An error occurred while fetching assets: ${err}`);
  }
};

export async function initDigitalTwin(
  newDigitalTwinName: string,
): Promise<DigitalTwin> {
  try {
    const digitalTwinGitlabInstance = await createInitializedInstance();
    const digitalTwin = new DigitalTwin(
      newDigitalTwinName,
      digitalTwinGitlabInstance,
    );
    await digitalTwin.initialize();
    return digitalTwin;
  } catch (error) {
    throw new Error(
      `Failed to initialize DigitalTwin for ${newDigitalTwinName}`,
      { cause: error },
    );
  }
}
