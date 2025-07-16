import { Dispatch, SetStateAction } from 'react';
import { useDispatch } from 'react-redux';
import { AssetTypes } from 'model/backend/gitlab/constants';
import { getAuthority } from 'util/envUtil';
import DigitalTwin from './digitalTwin';
import { setAsset } from '../store/assets.slice';
import { setDigitalTwin } from '../store/digitalTwin.slice';
import LibraryAsset, { getLibrarySubfolders } from './libraryAsset';
import { getDTSubfolders } from './digitalTwinUtils';
import { createGitlabInstance } from '../../model/backend/gitlab/gitlabFactory';
import LibraryManager from './libraryManager';

const initialGitlabInstance = createGitlabInstance(
  sessionStorage.getItem('username') || '',
  sessionStorage.getItem('access_token') || '',
  getAuthority(),
);

export const fetchLibraryAssets = async (
  dispatch: ReturnType<typeof useDispatch>,
  setError: Dispatch<SetStateAction<string | null>>,
  type: string,
  isPrivate: boolean,
) => {
  try {
    await initialGitlabInstance.init();
    const subfolders = await getLibrarySubfolders(
      initialGitlabInstance.getProjectId(),
      type as keyof typeof AssetTypes,
      initialGitlabInstance,
    );

    const assets = await Promise.all(
      subfolders.map(async (subfolder) => {
        const gitlabInstance = createGitlabInstance(
          sessionStorage.getItem('username') || '',
          sessionStorage.getItem('access_token') || '',
          getAuthority(),
        );
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

    const subfolders = await getDTSubfolders(
      initialGitlabInstance.getProjectId(),
      initialGitlabInstance.api,
    );

    await fetchLibraryAssets(dispatch, setError, 'Digital Twins', true);
    const digitalTwins = await Promise.all(
      subfolders.map(async (asset) => {
        const gitlabInstance = createGitlabInstance(
          sessionStorage.getItem('username') || '',
          sessionStorage.getItem('access_token') || '',
          getAuthority(),
        );
        await gitlabInstance.init();
        const digitalTwin = new DigitalTwin(asset.name, gitlabInstance);
        await digitalTwin.getDescription();
        return { assetName: asset.name, digitalTwin };
      }),
    );
    digitalTwins.forEach(({ assetName, digitalTwin }) =>
      dispatch(setDigitalTwin({ assetName, digitalTwin })),
    );
  } catch (err) {
    setError(`An error occurred while fetching assets: ${err}`);
  }
};

export async function initDigitalTwin(
  newDigitalTwinName: string,
): Promise<DigitalTwin> {
  const digitalTwinGitlabInstance = createGitlabInstance(
    sessionStorage.getItem('username') || '',
    sessionStorage.getItem('access_token') || '',
    getAuthority(),
  );
  await digitalTwinGitlabInstance.init();
  return new DigitalTwin(newDigitalTwinName, digitalTwinGitlabInstance);
}
