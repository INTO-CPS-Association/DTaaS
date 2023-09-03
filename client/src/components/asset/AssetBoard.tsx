import * as React from 'react';
import { Grid } from '@mui/material';
import useAssets from 'util/apiUtil';
import AssetCard from './AssetCard';

const outerGridContainerProps = {
  container: true,
  spacing: 2,
  sx: {
    justifyContent: 'flex-start',
    overflow: 'auto',
    maxHeight: 'inherent',
  },
};

// TODO: Make it not capital letters.!

/**
 * Displays a board with navigational properties to locate and select assets for DT configuration.
 * @param props Takes relative path to Assets. E.g `Functions` for function assets.
 * @returns
 */
function AssetBoard(props: { pathToAssets: string; privateRepo?: boolean }) {
  // eslint-disable-next-line no-console
  console.log(props.pathToAssets);
  const assetsFetched = useAssets(props.pathToAssets, props.privateRepo);

  if (!assetsFetched.data.length) {
    return (
      <em style={{ textAlign: 'center' }}>{assetsFetched.errorMessage}</em>
    );
  }

  return (
    <Grid {...outerGridContainerProps}>
      {assetsFetched.data.map((asset, i) => (
        <Grid key={i} item xs={12} sm={6} md={4} lg={3} sx={{ minWidth: 250 }}>
          <AssetCard asset={asset} />
        </Grid>
      ))}
    </Grid>
  );
}

export default AssetBoard;
