import { useEffect, useState } from 'react';
import { Grid, CircularProgress, Box } from '@mui/material';
import { AssetCardLibrary } from 'components/asset/AssetCard';
import { useDispatch, useSelector } from 'react-redux';
import { selectAssetsByTypeAndPrivacy } from 'model/store/assets.slice';
import { fetchLibraryAssets } from 'model/backend/util/init';
import Filter from 'components/asset/Filter';

const outerGridContainerProps = {
  container: true,
  spacing: 2,
  sx: {
    justifyContent: 'flex-start',
    overflow: 'auto',
    maxHeight: 'inherent',
  },
};

interface AssetLibraryProps {
  readonly pathToAssets: string;
  readonly privateRepo: boolean;
}

function AssetLibrary({ pathToAssets, privateRepo }: AssetLibraryProps) {
  const assets = useSelector(
    selectAssetsByTypeAndPrivacy(pathToAssets, privateRepo),
  );
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await fetchLibraryAssets(dispatch, setError, pathToAssets, privateRepo);
      setLoading(false);
    };
    fetchData();
  }, [dispatch, pathToAssets, privateRepo]);

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
        {filteredAssets.map((asset) => (
          <Grid
            key={asset.name}
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
