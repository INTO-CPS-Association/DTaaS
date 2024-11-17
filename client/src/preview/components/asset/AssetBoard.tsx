import * as React from 'react';
import { Grid } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import {
  deleteAsset,
  selectAssetsByTypeAndPrivacy,
} from 'preview/store/assets.slice';
import { fetchDigitalTwins } from 'preview/util/init';
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
  const assets = useSelector(
    selectAssetsByTypeAndPrivacy('Digital Twins', true),
  );
  const [error, setError] = React.useState<string | null>(null);
  const dispatch = useDispatch();

  React.useEffect(() => {
    const fetchData = async () => {
      await fetchDigitalTwins(dispatch, setError);
    };
    fetchData();
  }, [dispatch]);

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
