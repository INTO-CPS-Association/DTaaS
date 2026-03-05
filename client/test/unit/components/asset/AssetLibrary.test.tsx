import { act, render, screen, waitFor } from '@testing-library/react';
import { Provider, useSelector } from 'react-redux';
import AssetLibrary from 'components/asset/AssetLibrary';
import store, { RootState } from 'store/store';
import { mockLibraryAsset } from 'test/__mocks__/global_mocks';
import { selectAssetsByTypeAndPrivacy } from 'model/store/assets.slice';

jest.mock('model/store/assets.slice', () => ({
  ...jest.requireActual('model/store/assets.slice'),
  selectAssetsByTypeAndPrivacy: jest.fn(() => []),
}));

jest.mock('model/backend/util/init', () => ({
  fetchLibraryAssets: jest.fn(() => Promise.resolve()),
}));

jest.mock('components/asset/Filter', () => ({
  __esModule: true,
  default: () => <div>Filter</div>,
}));

jest.mock('components/asset/AssetCard', () => ({
  __esModule: true,
  AssetCardLibrary: () => <div>Asset Card Library</div>,
}));

describe('AssetLibrary', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      (selector: (state: RootState) => unknown) => {
        if (selector === selectAssetsByTypeAndPrivacy('path', false)) {
          return [mockLibraryAsset];
        }
        return [];
      },
    );
  });

  const renderAssetLibrary = () =>
    act(async () => {
      render(
        <Provider store={store}>
          <AssetLibrary pathToAssets="path" privateRepo={false} />
        </Provider>,
      );
    });

  it('renders assets when fetched', async () => {
    await renderAssetLibrary();

    await waitFor(() =>
      expect(screen.getByText('Asset Card Library')).toBeInTheDocument(),
    );
  });
});
