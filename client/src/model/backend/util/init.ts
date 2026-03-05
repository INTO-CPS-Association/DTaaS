import { Dispatch, SetStateAction } from 'react';
import { useDispatch } from 'react-redux';
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

    for (const asset of assets) {
      dispatch(setAsset(asset));
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
