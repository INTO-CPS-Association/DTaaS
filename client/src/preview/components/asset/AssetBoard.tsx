import * as React from 'react';
import { Grid, CircularProgress } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import {
  deleteAsset,
  selectAssetsByTypeAndPrivacy,
} from 'preview/store/assets.slice';
import { fetchDigitalTwins } from 'preview/util/init';
import { setShouldFetchDigitalTwins } from 'preview/store/digitalTwin.slice';
import { RootState } from 'store/store';
import Filter from './Filter';
import { Asset } from './Asset';
import { AssetCardExecute, AssetCardManage } from './AssetCard';

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
    item
    xs={12}
    sm={6}
    md={4}
    lg={3}
    sx={{ minWidth: 250 }}
  >
    {tab === 'Execute' ? (
      <AssetCardExecute asset={asset} />
    ) : (
      <AssetCardManage asset={asset} onDelete={() => onDelete(asset.path)} />
    )}
  </Grid>
);

const AssetBoard: React.FC<AssetBoardProps> = ({ tab }) => {
  const allAssets = useSelector(
    selectAssetsByTypeAndPrivacy('Digital Twins', true),
  );
  const [filter, setFilter] = React.useState<string>('');
  const [error, setError] = React.useState<string | null>(null);
  const shouldFetchDigitalTwins = useSelector(
    (state: RootState) => state.digitalTwin.shouldFetchDigitalTwins,
  );
  const [loading, setLoading] = React.useState<boolean>(true);
  const dispatch = useDispatch();

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await fetchDigitalTwins(dispatch, setError);
      } finally {
        setLoading(false);
        dispatch(setShouldFetchDigitalTwins(false));
      }
    };

    if (shouldFetchDigitalTwins === true) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [dispatch]);

  const handleDelete = (deletedAssetPath: string) => {
    dispatch(deleteAsset(deletedAssetPath));
  };

  const filteredAssets = allAssets.filter((asset) =>
    asset.name.toLowerCase().includes(filter.toLowerCase()),
  );

  if (error) {
    return <em style={{ textAlign: 'center' }}>{error}</em>;
  }

  return (
    <>
      {loading ? (
        <Grid
          container
          justifyContent="center"
          alignItems="center"
          sx={{ minHeight: '10rem' }}
        >
          <CircularProgress />
        </Grid>
      ) : (
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
      )}
    </>
  );
};

export default AssetBoard;
