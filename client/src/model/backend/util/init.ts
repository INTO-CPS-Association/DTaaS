import { Dispatch, SetStateAction } from 'react';
import type { Dispatch as ReduxDispatch } from '@reduxjs/toolkit';
import { AssetTypes } from 'model/backend/gitlab/digitalTwinConfig/constants';
import { getAuthority } from 'util/envUtil';
import { extractDataFromDigitalTwin } from 'model/backend/util/digitalTwinAdapter';
import { setDigitalTwin } from 'model/backend/state/digitalTwin.slice';
import DigitalTwin from 'model/backend/digitalTwin';
import { setAsset } from 'model/store/assets.slice';
import LibraryAsset, { getLibrarySubfolders } from 'model/backend/libraryAsset';
import { getDTSubfolders } from 'model/backend/util/digitalTwinUtils';
import { createGitlabInstance } from 'model/backend/gitlab/gitlabFactory';
import LibraryManager from 'model/backend/libraryManager';

export const fetchLibraryAssets = async (
  dispatch: ReduxDispatch,
  setError: Dispatch<SetStateAction<string | null>>,
  type: string,
  isPrivate: boolean,
) => {
  try {
    const instance = createGitlabInstance(
      sessionStorage.getItem('username') || '',
      sessionStorage.getItem('access_token') || '',
      getAuthority(),
    );
    await instance.init();
    const subfolders = await getLibrarySubfolders(
      instance.getProjectId(),
      type as keyof typeof AssetTypes,
      instance,
    );
    const assets = await Promise.all(
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

    for (const asset of assets) {
      dispatch(setAsset(asset));
    }
  } catch (err) {
    setError(`An error occurred while fetching assets: ${err}`);
  }
};

export const fetchDigitalTwins = async (
  dispatch: ReduxDispatch,
  setError: Dispatch<SetStateAction<string | null>>,
) => {
  try {
    const instance = createGitlabInstance(
      sessionStorage.getItem('username') || '',
      sessionStorage.getItem('access_token') || '',
      getAuthority(),
    );
    await instance.init();
    const subfolders = await getDTSubfolders(
      instance.getProjectId(),
      instance.api,
    );

    await fetchLibraryAssets(dispatch, setError, 'Digital Twins', true);

    const dtInstance = createGitlabInstance(
      sessionStorage.getItem('username') || '',
      sessionStorage.getItem('access_token') || '',
      getAuthority(),
    );
    await dtInstance.init();
    const digitalTwins = await Promise.all(
      subfolders.map(async (asset) => {
        const digitalTwin = new DigitalTwin(asset.name, dtInstance);
        await digitalTwin.getDescription();
        return { assetName: asset.name, digitalTwin };
      }),
    );

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
    const digitalTwinGitlabInstance = createGitlabInstance(
      sessionStorage.getItem('username') || '',
      sessionStorage.getItem('access_token') || '',
      getAuthority(),
    );
    await digitalTwinGitlabInstance.init();
    return new DigitalTwin(newDigitalTwinName, digitalTwinGitlabInstance);
  } catch (error) {
    throw new Error(
      `Failed to initialize DigitalTwin for ${newDigitalTwinName}: ${error}`,
    );
  }
}
