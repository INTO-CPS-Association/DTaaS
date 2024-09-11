import React from 'react';
import { Grid } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { GitlabInstance } from 'util/gitlab';
import { RootState } from 'store/store';
import { deleteAsset } from 'store/assets.slice';
import { AssetCardManage, AssetCardExecute } from './AssetCard';

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

function AssetBoard(props: {
  tab: string;
  gitlabInstance: GitlabInstance;
  error: string | null;
}) {
  const assets = useSelector((state: RootState) => state.assets.items);
  const dispatch = useDispatch();

  const handleDelete = (deletedAssetPath: string) => {
    dispatch(deleteAsset(deletedAssetPath));
  };

  if (props.error) {
    return <em style={{ textAlign: 'center' }}>{props.error}</em>;
  }

  return (
    <Grid {...outerGridContainerProps}>
      {assets.map((asset) => (
        <Grid
          key={asset.path}
          item
          xs={12}
          sm={6}
          md={4}
          lg={3}
          sx={{ minWidth: 250 }}
        >
          {props.tab === 'Execute' ? (
            <AssetCardExecute asset={asset} />
          ) : (
            <AssetCardManage
              asset={asset}
              onDelete={() => handleDelete(asset.path)}
            />
          )}
        </Grid>
      ))}
    </Grid>
  );
}

export default AssetBoard;
