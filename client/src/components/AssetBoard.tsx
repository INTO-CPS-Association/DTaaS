import * as React from 'react';
import { Grid } from '@mui/material';
import { Asset } from 'models/Asset';
import useAssets from 'util/apiUtil';
import AssetCard from './AssetBoard/AssetCard';

const outerGridContainerProps = {
  container: true,
  spacing: 2,
  sx: {
    justifyContent: 'flex-start',
    overflow: 'auto',
    maxHeight: 'inherent',
  },
};

/**
 * Displays a board with navigational properties to locate and select assets for DT configuration.
 * @param props Takes relative path to Assets. E.g `Library` for Library assets. OR maybe the full path using `useURLforLIB`?
 * @returns
 */
function AssetBoard(props: { pathToAssets?: string; privateRepo?: boolean }) {
  if (!props.pathToAssets) {
    return <em style={{ textAlign: 'center' }}>loading...</em>;
  }
  const assets: Asset[] = useAssets(props.pathToAssets, props.privateRepo);

  if (!assets.length) {
    return <em style={{ textAlign: 'center' }}>No assets found.</em>;
  }

  return (
    <Grid {...outerGridContainerProps}>
      {assets.map((asset, i) => (
        <Grid key={i} item xs={12} sm={6} md={4} lg={3} sx={{ minWidth: 250 }}>
          <AssetCard asset={asset} />
        </Grid>
      ))}
    </Grid>
  );
}

export default AssetBoard;
