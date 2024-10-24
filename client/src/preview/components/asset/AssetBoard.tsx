import * as React from 'react';
import { Grid } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from 'store/store';
import { deleteAsset } from 'preview/store/assets.slice';
import { AssetCardExecute, AssetCardManage } from './AssetCard';
import { Asset } from './Asset';

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
  error: string | null;
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

const AssetBoard: React.FC<AssetBoardProps> = ({ tab, error }) => {
  const assets = useSelector((state: RootState) => state.assets.items);
  const dispatch = useDispatch();

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
