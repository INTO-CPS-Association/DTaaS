import * as React from 'react';
import { Grid } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'store/store';
import { deleteAsset } from 'store/assets.slice';
import { AssetCardExecute } from './AssetCard';
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
  onDelete: (path: string, dispatch: ReturnType<typeof useDispatch>) => void;
}> = ({ asset }) => (
  <Grid
    key={asset.path}
    item
    xs={12}
    sm={6}
    md={4}
    lg={3}
    sx={{ minWidth: 250 }}
  >
      <AssetCardExecute asset={asset} />
  </Grid>
);

export const handleDelete = function (deletedAssetPath: string, dispatch: ReturnType<typeof useDispatch>) {
  return function () {
    dispatch(deleteAsset(deletedAssetPath));
  };
};

const AssetBoard: React.FC<AssetBoardProps> = ({ tab, error }) => {
  const assets = useSelector((state: RootState) => state.assets.items);
  const dispatch = useDispatch();

  if (error) {
    return <em style={{ textAlign: 'center' }}>{error}</em>;
  }

  return (
    <Grid {...outerGridContainerProps}>
      {assets.map((asset: Asset) => (
        <AssetGridItem
          key={asset.path}
          asset={asset}
          tab={tab}
          onDelete={handleDelete(asset.path, dispatch)}
        />
      ))}
    </Grid>
  );
};

export default AssetBoard;
