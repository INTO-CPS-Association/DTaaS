import * as React from 'react';
import { Grid } from '@mui/material';
import { GitlabInstance } from 'util/gitlab';
import { Asset } from './Asset';
import AssetCardExecute from './AssetCard';

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


/**
 * Displays a board with navigational properties to locate and select assets for DT configuration.
 * @param props Takes relative path to Assets. E.g `Functions` for function assets.
 * @returns
 */
function AssetBoard(props: { subfolders: Asset[], gitlabInstance: GitlabInstance, error: string | null }) {

if (props.error) {
  return (
    <em style={{ textAlign: 'center' }}>{props.error}</em>
  );
}

return (
  <Grid {...outerGridContainerProps}>
    {props.subfolders.map((asset, index) => (
      <Grid key={asset.path} item xs={12} sm={6} md={4} lg={3} sx={{ minWidth: 250 }}>
        <AssetCardExecute asset={asset} />
      </Grid>
    ))}
  </Grid>
  )
}

export default AssetBoard;
