import { Dispatch, SetStateAction } from 'react';
import { useDispatch } from 'react-redux';
import { getAuthority } from 'util/envUtil';
import GitlabInstance from './gitlab';
import DigitalTwin from './digitalTwin';
import { setAsset, setAssets } from '../store/assets.slice';
import { setDigitalTwin } from '../store/digitalTwin.slice';
import LibraryAsset from './libraryAsset';

const initialGitlabInstance = new GitlabInstance(
  sessionStorage.getItem('username') || '',
  getAuthority(),
  sessionStorage.getItem('access_token') || '',
);

function createGitlabInstance(): GitlabInstance {
  const username = sessionStorage.getItem('username') || '';
  const authority = getAuthority();
  const accessToken = sessionStorage.getItem('access_token') || '';

  return new GitlabInstance(username, authority, accessToken);
}

export const fetchLibraryAssets = async (
  dispatch: ReturnType<typeof useDispatch>,
  setError: Dispatch<SetStateAction<string | null>>,
  type: string,
  isPrivate: boolean,
) => {
  try {
    await initialGitlabInstance.init();
    if (initialGitlabInstance.projectId) {
      const subfolders = await initialGitlabInstance.getLibrarySubfolders(
        initialGitlabInstance.projectId,
        type,
        isPrivate,
      );

      for (const subfolder of subfolders) {
        const gitlabInstance = createGitlabInstance();
        await gitlabInstance.init();
        const libraryAsset = new LibraryAsset(
          subfolder.name,
          subfolder.path,
          isPrivate,
          type,
          gitlabInstance,
        );
        await libraryAsset.getDescription();
        dispatch(setAsset(libraryAsset));
      }
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
      const subfolders = await initialGitlabInstance.getDTSubfolders(
        initialGitlabInstance.projectId,
      );
      await fetchLibraryAssets(dispatch, setError, 'Digital Twins', true);
      subfolders.forEach(async (asset) => {
        const gitlabInstance = createGitlabInstance();
        await gitlabInstance.init();
        const digitalTwin = new DigitalTwin(asset.name, gitlabInstance);
        await digitalTwin.getDescription();
        dispatch(setDigitalTwin({ assetName: asset.name, digitalTwin }));
      });
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
