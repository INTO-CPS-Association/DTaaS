import {
  combineReducers,
  configureStore,
  getDefaultMiddleware,
} from '@reduxjs/toolkit';
import { fireEvent, render, screen, act } from '@testing-library/react';
import { AssetCardExecute } from 'preview/components/asset/AssetCard';
import * as React from 'react';
import { Provider } from 'react-redux';
import assetsReducer, { setAssets } from 'store/assets.slice';
import digitalTwinReducer, { setDigitalTwin } from 'store/digitalTwin.slice';
import snackbarSlice from 'store/snackbar.slice';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';

const store = configureStore({
  reducer: combineReducers({
    assets: assetsReducer,
    digitalTwin: digitalTwinReducer,
    snackbar: snackbarSlice,
  }),
  middleware: getDefaultMiddleware({
    serializableCheck: false,
  }),
});

describe('AssetCardExecute Integration Test', () => {
  const asset = {
    name: 'Asset 1',
    description: 'Mocked description',
    path: 'path/asset1',
  };

  beforeEach(() => {
    store.dispatch(
      setAssets([
        {
          name: 'Asset 1',
          description: 'Mocked description',
          path: 'path/asset1',
        },
      ]),
    );
    store.dispatch(
      setDigitalTwin({
        assetName: 'Asset 1',
        digitalTwin: mockDigitalTwin,
      }),
    );

    render(
      <Provider store={store}>
        <AssetCardExecute asset={asset} />
      </Provider>,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('opens the Snackbar after clicking the Start button', async () => {
    const startStopButton = screen.getByRole('button', { name: /Start/i });

    await act(async () => {
      fireEvent.click(startStopButton);
    });

    expect(
      screen.getByText('Execution mockedStatus for MockedDTName'),
    ).toBeInTheDocument();
  });
});
