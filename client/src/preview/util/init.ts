import { Dispatch, SetStateAction } from 'react';
import { useDispatch } from 'react-redux';
import { getAuthority } from 'util/envUtil';
import GitlabInstance from './gitlab';
import DigitalTwin from './digitalTwin';
import { setAssets } from '../store/assets.slice';
import { setDigitalTwin } from '../store/digitalTwin.slice';

const gitlabInstance = new GitlabInstance(
  sessionStorage.getItem('username') || '',
  getAuthority(),
  sessionStorage.getItem('access_token') || '',
);

export const fetchAssetsAndCreateTwins = async (
  dispatch: ReturnType<typeof useDispatch>,
  setError: Dispatch<SetStateAction<string | null>>,
) => {
  try {
    await gitlabInstance.init();
    if (gitlabInstance.projectId) {
      const subfolders = await gitlabInstance.getDTSubfolders(
        gitlabInstance.projectId,
      );
      dispatch(setAssets(subfolders));

      subfolders.forEach(async (asset) => {
        const digitalTwin = new DigitalTwin(asset.name, gitlabInstance);
        await digitalTwin.getDescription();
        dispatch(setDigitalTwin({ assetName: asset.name, digitalTwin }));
      });
    } else {
      dispatch(setAssets([]));
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
