import Layout from 'page/Layout';
import TabComponent from 'components/tab/TabComponent';
import { Paper, Typography } from '@mui/material';
import ShoppingCart from 'preview/components/cart/ShoppingCart';
import AssetLibrary from 'preview/components/asset/AssetLibrary';
import { assetType, scope } from 'preview/route/library/LibraryTabDataPreview';

export function createTabs() {
  return assetType.map((tab) => ({
    label: tab.label,
    body: (
      <>
        <Typography variant="body1">{tab.body}</Typography>
      </>
    ),
  }));
}

export function createCombinedTabs() {
  return assetType.map((tab) =>
    scope.map((subtab) => ({
      label: `${subtab.label}`,
      body: (
        <div style={{ display: 'flex', gap: '2rem' }}>
          <div style={{ flex: 2 }}>
            <Typography variant="body1">{subtab.body}</Typography>
            <AssetLibrary
              pathToAssets={tab.label}
              privateRepo={subtab.label === 'Private'}
            />
          </div>
          <Paper
            sx={{
              flex: 1,
              minWidth: '20rem',
              textAlign: 'center',
              paddingTop: '2rem',
              height: '300px',
            }}
          >
            <Typography variant="h5">Selection</Typography>
            <ShoppingCart />
          </Paper>
        </div>
      ),
    })),
  );
}

function LibraryContent() {
  const tabsData = createTabs();
  const combinedData = createCombinedTabs();

  return (
    <Layout>
      <TabComponent assetType={tabsData} scope={combinedData} />
    </Layout>
  );
}

export default function LibraryPreview() {
  return <LibraryContent />;
}
