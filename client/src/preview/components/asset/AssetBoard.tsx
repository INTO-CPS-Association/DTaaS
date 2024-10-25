import * as React from 'react';
import { Grid } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from 'store/store';
import { deleteAsset, setAssets } from 'preview/store/assets.slice';
import { setDigitalTwin } from 'preview/store/digitalTwin.slice';
import GitlabInstance from 'preview/util/gitlab';
import DigitalTwin from 'preview/util/gitlabDigitalTwin';
import { getAuthority } from 'util/envUtil';
import { Asset } from './Asset';
import { AssetCardExecute, AssetCardManage } from './AssetCard';

const outerGridContainerProps = {
  container: true,
  spacing: 2,
  sx: {
    justifyContent: 'flex-start',
    overflow: 'auto',
    maxHeight: 'inherent',
    marginTop: 2,
  },
};

interface AssetBoardProps {
  tab: string;
}

const AssetGridItem: React.FC<{
  asset: Asset;
  tab: string;
  onDelete: (path: string) => void;
}> = ({ asset, tab, onDelete }) => (
  <Grid
    key={asset.path}
    item
    xs={12}
    sm={6}
    md={4}
    lg={3}
    sx={{ minWidth: 250 }}
  >
    {tab === 'Execute' ? (
      <AssetCardExecute asset={asset} />
    ) : (
      <AssetCardManage asset={asset} onDelete={() => onDelete(asset.path)} />
    )}
  </Grid>
);

const AssetBoard: React.FC<AssetBoardProps> = ({ tab }) => {
  const assets = useSelector((state: RootState) => state.assets.items);
  const [error, setError] = React.useState<string | null>(null);
  const dispatch = useDispatch();

  const gitlabInstance = new GitlabInstance(
    sessionStorage.getItem('username') || '',
    getAuthority(),
    sessionStorage.getItem('access_token') || '',
  );

  React.useEffect(() => {
    const fetchAssetsAndCreateTwins = async () => {
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

    fetchAssetsAndCreateTwins();
  }, []);

  const handleDelete = (deletedAssetPath: string) => {
    dispatch(deleteAsset(deletedAssetPath));
  };

  if (error) {
    return <em style={{ textAlign: 'center' }}>{error}</em>;
  }

  return (
    <Grid {...outerGridContainerProps}>
      {assets.map((asset) => (
        <AssetGridItem
          key={asset.path}
          asset={asset}
          tab={tab}
          onDelete={handleDelete}
        />
      ))}
    </Grid>
  );
};

export default AssetBoard;
