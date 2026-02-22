import React, { useState, useEffect } from 'react';
import { Grid, CircularProgress } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import {
  deleteAsset,
  selectAssetsByTypeAndPrivacy,
} from 'model/store/assets.slice';
import { fetchDigitalTwins } from 'model/backend/util/init';
import { setShouldFetchDigitalTwins } from 'model/backend/state/digitalTwin.slice';
import { RootState } from 'store/store';
import Filter from 'components/asset/Filter';
import { Asset } from 'model/backend/Asset';
import { AssetCardExecute } from 'components/asset/AssetCard';
import AssetCardManage from 'components/asset/AssetCardManage';

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
}

const AssetGridItem: React.FC<{
  asset: Asset;
  tab: string;
  onDelete: (path: string) => void;
}> = ({ asset, tab, onDelete }) => (
  <Grid
    key={asset.path}
    size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
    sx={{ minWidth: 250 }}
  >
    {tab === 'Execute' ? (
      <AssetCardExecute asset={asset} />
    ) : (
      <AssetCardManage asset={asset} onDelete={() => onDelete(asset.path)} />
    )}
  </Grid>
);

const LoadingSpinner: React.FC = () => (
  <Grid
    container
    justifyContent="center"
    alignItems="center"
    sx={{ minHeight: '10rem' }}
  >
    <CircularProgress />
  </Grid>
);

const ErrorMessage: React.FC<{ error: string }> = ({ error }) => (
  <em style={{ textAlign: 'center' }}>{error}</em>
);

const filterAssets = (assets: Asset[], filter: string): Asset[] =>
  assets.filter((asset) =>
    asset.name.toLowerCase().includes(filter.toLowerCase()),
  );

const useFetchDigitalTwins = (
  shouldFetch: boolean,
  dispatch: ReturnType<typeof useDispatch>,
) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await fetchDigitalTwins(dispatch, setError);
      } finally {
        setLoading(false);
        dispatch(setShouldFetchDigitalTwins(false));
      }
    };

    if (shouldFetch) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [dispatch, shouldFetch]);

  return { loading, error };
};

const AssetBoard: React.FC<AssetBoardProps> = ({ tab }) => {
  const allAssets = useSelector(
    selectAssetsByTypeAndPrivacy('Digital Twins', true),
  );
  const [filter, setFilter] = useState<string>('');
  const shouldFetchDigitalTwins = useSelector(
    (state: RootState) => state.digitalTwin.shouldFetchDigitalTwins,
  );
  const dispatch = useDispatch();

  const { loading, error } = useFetchDigitalTwins(
    shouldFetchDigitalTwins,
    dispatch,
  );

  const handleDelete = (deletedAssetPath: string) => {
    dispatch(deleteAsset(deletedAssetPath));
  };

  const filteredAssets = filterAssets(allAssets, filter);

  if (error) return <ErrorMessage error={error} />;
  if (loading) return <LoadingSpinner />;

  return (
    <>
      <Filter value={filter} onChange={setFilter} />
      <Grid {...outerGridContainerProps}>
        {filteredAssets.map((asset) => (
          <AssetGridItem
            key={asset.path}
            asset={asset}
            tab={tab}
            onDelete={handleDelete}
          />
        ))}
      </Grid>
    </>
  );
};

export default AssetBoard;
