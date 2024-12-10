import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, act } from '@testing-library/react';
import { AssetCardExecute } from 'preview/components/asset/AssetCard';
import * as React from 'react';
import { Provider, useSelector } from 'react-redux';
import assetsReducer, {
  selectAssetByPathAndPrivacy,
  setAssets,
} from 'preview/store/assets.slice';
import digitalTwinReducer, {
  setDigitalTwin,
} from 'preview/store/digitalTwin.slice';
import snackbarSlice from 'preview/store/snackbar.slice';
import {
  mockDigitalTwin,
  mockLibraryAsset,
} from 'test/preview/__mocks__/global_mocks';
import { RootState } from 'store/store';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const store = configureStore({
  reducer: combineReducers({
    assets: assetsReducer,
    digitalTwin: digitalTwinReducer,
    snackbar: snackbarSlice,
  }),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

describe('AssetCardExecute Integration Test', () => {
  const asset = {
    name: 'Asset 1',
    description: 'Mocked description',
    path: 'path/asset1',
    type: 'Digital twins',
    isPrivate: true,
  };

  beforeEach(() => {
    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      (selector: (state: RootState) => unknown) => {
        if (
          selector === selectAssetByPathAndPrivacy(asset.path, asset.isPrivate)
        ) {
          return null;
        }
        return mockDigitalTwin;
      },
    );

    store.dispatch(setAssets([mockLibraryAsset]));
    store.dispatch(
      setDigitalTwin({
        assetName: 'Asset 1',
        digitalTwin: mockDigitalTwin,
      }),
    );

    act(() => {
      render(
        <Provider store={store}>
          <AssetCardExecute asset={asset} />
        </Provider>,
      );
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should start execution', async () => {
    const startStopButton = screen.getByRole('button', { name: /Start/i });

    await act(async () => {
      fireEvent.click(startStopButton);
    });

    expect(screen.getByText('Stop')).toBeInTheDocument();
  });
});
