import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider, useSelector } from 'react-redux';
import AssetLibrary from 'preview/components/asset/AssetLibrary';
import store, { RootState } from 'store/store';
import { selectAssetsByTypeAndPrivacy } from 'preview/store/assets.slice';
import { mockLibraryAsset } from 'test/preview/__mocks__/global_mocks';

jest.mock('preview/store/assets.slice', () => ({
  selectAssetsByTypeAndPrivacy: jest.fn(() => []),
}));

jest.mock('preview/util/init', () => ({
  fetchLibraryAssets: jest.fn(() => Promise.resolve()),
}));

jest.mock('preview/components/asset/Filter', () => ({
  __esModule: true,
  default: () => <div>Filter</div>,
}));

jest.mock('preview/components/asset/AssetCard', () => ({
  __esModule: true,
  AssetCardLibrary: () => <div>Asset Card Library</div>,
}));

describe('AssetLibrary', () => {
  beforeEach(() => {
    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      (selector: (state: RootState) => unknown) => {
        if (selector === selectAssetsByTypeAndPrivacy('path', false)) {
          return [mockLibraryAsset];
        }
        return [mockLibraryAsset];
      },
    );
  });

  const renderAssetLibrary = () =>
    render(
      <Provider store={store}>
        <AssetLibrary pathToAssets="path" privateRepo={false} />
      </Provider>,
    );

  it('renders a loading spinner while assets are being fetched', () => {
    renderAssetLibrary();
    expect(screen.getByTestId('circular-progress')).toBeInTheDocument();
  });

  it('renders assets when fetched', async () => {
    renderAssetLibrary();

    await waitFor(() => screen.getByText('Asset Card Library'));

    expect(screen.getByText('Asset Card Library')).toBeInTheDocument();
  });
});
