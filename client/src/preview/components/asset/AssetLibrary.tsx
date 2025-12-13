import { useEffect, useState } from 'react';
import { Grid, CircularProgress, Box } from '@mui/material';
import { AssetCardLibrary } from 'preview/components/asset/AssetCard';
import { useDispatch, useSelector } from 'react-redux';
import { selectAssetsByTypeAndPrivacy } from 'preview/store/assets.slice';
import { fetchLibraryAssets } from 'model/backend/util/init';
import Filter from 'preview/components/asset/Filter';

const outerGridContainerProps = {
  container: true,
  spacing: 2,
  sx: {
    justifyContent: 'flex-start',
    overflow: 'auto',
    maxHeight: 'inherent',
  },
};

function AssetLibrary(props: { pathToAssets: string; privateRepo: boolean }) {
  const assets = useSelector(
    selectAssetsByTypeAndPrivacy(props.pathToAssets, props.privateRepo),
  );
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const dispatch = useDispatch();

  useEffect(() => {
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

  const filteredAssets = assets.filter((asset) =>
    asset.name.toLowerCase().includes(filter.toLowerCase()),
  );

  if (loading) {
    return (
      <Grid
        container
        justifyContent="center"
        alignItems="center"
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 999,
        }}
      >
        <CircularProgress />
      </Grid>
    );
  }

  if (!assets.length) {
    return <em style={{ textAlign: 'center' }}>{error}</em>;
  }

  return (
    <>
      <Box sx={{ mb: 2 }}>
        <Filter value={filter} onChange={setFilter} />
      </Box>
      <Grid {...outerGridContainerProps}>
        {filteredAssets.map((asset, i) => (
          <Grid
            key={i}
            size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
            sx={{ minWidth: 250 }}
          >
            <AssetCardLibrary asset={asset} />
          </Grid>
        ))}
      </Grid>
    </>
  );
}

export default AssetLibrary;
