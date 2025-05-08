import * as React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import AssetBoard from 'preview/components/asset/AssetBoard';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import assetsReducer, { setAssets } from 'preview/store/assets.slice';
import digitalTwinReducer, {
  setDigitalTwin,
  setShouldFetchDigitalTwins,
} from 'preview/store/digitalTwin.slice';
import snackbarSlice from 'preview/store/snackbar.slice';
import {
  mockGitlabInstance,
  mockLibraryAsset,
} from 'test/preview/__mocks__/global_mocks';
import fileSlice, { addOrUpdateFile } from 'preview/store/file.slice';
import { FileState } from 'model/backend/gitlab/interfaces';
import DigitalTwin from 'preview/util/digitalTwin';
import LibraryAsset from 'preview/util/libraryAsset';
import libraryConfigFilesSlice from 'preview/store/libraryConfigFiles.slice';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

jest.mock('preview/util/init', () => ({
  fetchDigitalTwins: jest.fn(),
}));

jest.useFakeTimers();

const asset1 = mockLibraryAsset;
asset1.name = 'Asset 1';
const preSetItems: LibraryAsset[] = [asset1];

const files: FileState[] = [
  { name: 'Asset 1', content: 'content1', isNew: false, isModified: false },
];

const store = configureStore({
  reducer: combineReducers({
    assets: assetsReducer,
    digitalTwin: digitalTwinReducer,
    snackbar: snackbarSlice,
    files: fileSlice,
    libraryConfigFiles: libraryConfigFilesSlice,
  }),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

describe('AssetBoard Integration Tests', () => {
  const setupTest = () => {
    store.dispatch(setAssets(preSetItems));
    store.dispatch(
      setDigitalTwin({
        assetName: 'Asset 1',
        digitalTwin: new DigitalTwin('Asset 1', mockGitlabInstance),
      }),
    );
    store.dispatch(addOrUpdateFile(files[0]));
    store.dispatch(setShouldFetchDigitalTwins(true));
  };

  beforeEach(() => {
    setupTest();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders AssetBoard with AssetCardExecute', async () => {
    act(() => {
      render(
        <Provider store={store}>
          <AssetBoard tab="Execute" />
        </Provider>,
      );
    });

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Asset 1')).toBeInTheDocument();
  });

  it('renders AssetBoard with AssetCardManage', async () => {
    act(() => {
      render(
        <Provider store={store}>
          <AssetBoard tab="Manage" />
        </Provider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Asset 1')).toBeInTheDocument();
    });
  });

  it('deletes an asset', async () => {
    act(() => {
      render(
        <Provider store={store}>
          <AssetBoard tab="Manage" />
        </Provider>,
      );
    });

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    expect(deleteButton).toBeInTheDocument();

    act(() => {
      deleteButton.click();
    });

    const yesButton = await screen.findByRole('button', { name: /Yes/i });
    expect(yesButton).toBeInTheDocument();

    act(() => {
      yesButton.click();
    });

    await waitFor(() => {
      expect(screen.queryByText('Asset 1')).not.toBeInTheDocument();
    });
  });
});
