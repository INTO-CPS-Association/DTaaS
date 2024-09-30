import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import AssetBoard, { handleDelete } from 'preview/components/asset/AssetBoard';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import assetsReducer, { setAssets } from 'store/assets.slice';
import digitalTwinReducer, { setDigitalTwin } from 'store/digitalTwin.slice';
import snackbarSlice from 'store/snackbar.slice';
import { Asset } from 'preview/components/asset/Asset';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
}));

jest.useFakeTimers();

const preSetItems: Asset[] = [
  { name: 'Asset 1', description: 'Mocked description', path: 'path/asset1' },
];

const store = configureStore({
  reducer: combineReducers({
    assets: assetsReducer,
    digitalTwin: digitalTwinReducer,
    snackbar: snackbarSlice,
  }),
});

mockDigitalTwin.description = 'Mocked description';

describe.skip('AssetBoard Integration Tests', () => {
  const setupTest = () => {
    store.dispatch(
      setAssets(preSetItems)
    );
    store.dispatch(
      setDigitalTwin({
        assetName: 'Asset 1',
        digitalTwin: mockDigitalTwin,
      })
    );
  };

  beforeEach(() => {
    setupTest();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders AssetBoard with assets', () => {
    render(
      <Provider store={store}>
        <AssetBoard tab="testTab" error={null} />
      </Provider>
    );

    expect(screen.getByText('Asset 1')).toBeInTheDocument();
    expect(screen.getByText('Mocked description')).toBeInTheDocument();
  });

  it('renders error message when error is present', () => {
    render(
      <Provider store={store}>
        <AssetBoard tab="testTab" error="An error occurred" />
      </Provider>
    );

    expect(screen.getByText('An error occurred')).toBeInTheDocument();
  });

  it('deletes asset when onDelete is called', () => {
    const useDispatch = jest.fn();
    render(
        <Provider store={store}>
            <AssetBoard tab="testTab" error={null} />
        </Provider>,
    );

    handleDelete('path1', useDispatch)();

    expect(useDispatch).toHaveBeenCalledTimes(1);
});
});