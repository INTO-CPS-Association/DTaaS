import * as React from 'react';
import { Grid, CircularProgress } from '@mui/material';
import { AssetCardLibrary } from 'preview/components/asset/AssetCard';
import { useDispatch, useSelector } from 'react-redux';
import { selectAssetsByTypeAndPrivacy } from 'preview/store/assets.slice';
import { fetchLibraryAssets } from 'preview/util/init';

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
 * @param props Takes relative path to Assets. E.g `Functions` for function assets.
 * @returns
 */
function AssetLibrary(props: { pathToAssets: string; privateRepo: boolean }) {
  const assets = useSelector(
    selectAssetsByTypeAndPrivacy(props.pathToAssets, props.privateRepo),
  );
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const dispatch = useDispatch();

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await fetchLibraryAssets(
        dispatch,
        setError,
        props.pathToAssets,
        props.privateRepo,
      );
      setLoading(false);
    };
    fetchData();
  }, [dispatch, props.pathToAssets, props.privateRepo]);

  if (loading) {
    return (
      <Grid
        container
        justifyContent="center"
        alignItems="center"
        style={{ minHeight: '80vh', marginTop: '-10vh' }}
      >
        <CircularProgress />
      </Grid>
    );
  }

  if (!assets.length) {
    return <em style={{ textAlign: 'center' }}>{error}</em>;
  }

  return (
    <Grid {...outerGridContainerProps}>
      {assets.map((asset, i) => (
        <Grid key={i} item xs={12} sm={6} md={4} lg={3} sx={{ minWidth: 250 }}>
          <AssetCardLibrary asset={asset} />
        </Grid>
      ))}
    </Grid>
  );
}

export default AssetLibrary;
