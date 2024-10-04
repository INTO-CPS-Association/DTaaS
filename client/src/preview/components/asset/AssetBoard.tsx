import * as React from 'react';
import { Grid } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from 'store/store';
import AssetCardExecute from './AssetCard';
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

const AssetBoard: React.FC<AssetBoardProps> = ({ tab, error }) => {
  const assets = useSelector((state: RootState) => state.assets.items);

  if (error) {
    return <em style={{ textAlign: 'center' }}>{error}</em>;
  }

  return (
    <Grid {...outerGridContainerProps}>
      {assets.map((asset: Asset) => (
        <AssetGridItem key={asset.path} asset={asset} tab={tab} />
      ))}
    </Grid>
  );
};

export default AssetBoard;
