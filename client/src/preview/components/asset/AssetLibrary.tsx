/* eslint-disable no-console */

import * as React from 'react';
import { Grid } from '@mui/material';
import { AssetCardLibrary } from 'preview/components/asset/AssetCard';

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
function AssetLibrary(props: { pathToAssets: string; privateRepo?: boolean }) {
  // eslint-disable-next-line no-console
  console.log(props.pathToAssets);

  //TODO: Implement fetching assets from GitLab.
  const assetsFetched = [{
    name: 'Assets',
    path: 'path',
  }];

  if (!assetsFetched.length) {
    return (
        //TODO: substitute error with the specific error message.
      <em style={{ textAlign: 'center' }}>error</em>
    );
  }

  return (
    <Grid {...outerGridContainerProps}>
      {assetsFetched.map((asset, i) => (
        console.log('Creating AssetCardLibrary'),
        <Grid key={i} item xs={12} sm={6} md={4} lg={3} sx={{ minWidth: 250 }}>
          <AssetCardLibrary asset={asset} />
        </Grid>
      ))}
    </Grid>
  );
}

export default AssetLibrary;