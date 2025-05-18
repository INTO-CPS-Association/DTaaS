import { Dispatch, SetStateAction } from 'react';
import { useDispatch } from 'react-redux';
import { getAuthority } from 'util/envUtil';
import { AssetTypes } from 'model/backend/gitlab/constants';
import GitlabInstance from 'model/backend/gitlab/gitlab';
import DigitalTwin from './digitalTwin';
import { setAsset, setAssets } from '../store/assets.slice';
import { setDigitalTwin } from '../store/digitalTwin.slice';
import LibraryAsset, { getLibrarySubfolders } from './libraryAsset';
import { getDTSubfolders } from './digitalTwinUtils';
import { createGitlabInstance } from './gitlabFactory';
import LibraryManager from './libraryManager';

const initialGitlabInstance = new GitlabInstance(
  sessionStorage.getItem('username') || '',
  getAuthority(),
  sessionStorage.getItem('access_token') || '',
);

export const fetchLibraryAssets = async (
  dispatch: ReturnType<typeof useDispatch>,
  setError: Dispatch<SetStateAction<string | null>>,
  type: string,
  isPrivate: boolean,
) => {
  try {
    await initialGitlabInstance.init();
    if (initialGitlabInstance.projectId) {
      const subfolders = await getLibrarySubfolders(
        initialGitlabInstance.projectId,
        type as keyof typeof AssetTypes,
        initialGitlabInstance,
      );

      const assets = await Promise.all(
        subfolders.map(async (subfolder) => {
          const gitlabInstance = createGitlabInstance();
          await gitlabInstance.init();
          const libraryManager = new LibraryManager(
            subfolder.name,
            gitlabInstance,
          );
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
      assets.forEach((asset) => dispatch(setAsset(asset)));
    } else {
      dispatch(setAssets([]));
    }
  } catch (err) {
    setError(`An error occurred while fetching assets: ${err}`);
  }
};

export const fetchDigitalTwins = async (
  dispatch: ReturnType<typeof useDispatch>,
  setError: Dispatch<SetStateAction<string | null>>,
) => {
  try {
    await initialGitlabInstance.init();

    if (initialGitlabInstance.projectId) {
      const subfolders = await getDTSubfolders(
        initialGitlabInstance.projectId,
        initialGitlabInstance.api,
      );

      await fetchLibraryAssets(dispatch, setError, 'Digital Twins', true);
      const digitalTwins = await Promise.all(
        subfolders.map(async (asset) => {
          const gitlabInstance = createGitlabInstance();
          await gitlabInstance.init();
          const digitalTwin = new DigitalTwin(asset.name, gitlabInstance);
          await digitalTwin.getDescription();
          return { assetName: asset.name, digitalTwin };
        }),
      );
      digitalTwins.forEach(({ assetName, digitalTwin }) =>
        dispatch(setDigitalTwin({ assetName, digitalTwin })),
      );
    }
  } catch (err) {
    setError(`An error occurred while fetching assets: ${err}`);
  }
};

export async function initDigitalTwin(
  newDigitalTwinName: string,
): Promise<DigitalTwin> {
  const gitlabInstanceDT = new GitlabInstance(
    sessionStorage.getItem('username') || '',
    getAuthority(),
    sessionStorage.getItem('access_token') || '',
  );
  await gitlabInstanceDT.init();
  return new DigitalTwin(newDigitalTwinName, gitlabInstanceDT);
}
