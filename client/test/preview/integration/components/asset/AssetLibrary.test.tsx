import * as React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import AssetLibrary from 'preview/components/asset/AssetLibrary';
import assetsReducer, { setAssets } from 'preview/store/assets.slice';
import digitalTwinReducer from 'preview/store/digitalTwin.slice';
import snackbarSlice from 'preview/store/snackbar.slice';
import fileSlice from 'preview/store/file.slice';
import libraryConfigFilesSlice from 'preview/store/libraryConfigFiles.slice';
import LibraryAsset from 'preview/util/libraryAsset';
import { enableFetchMocks } from 'jest-fetch-mock';
import { mockGitlabInstance } from 'test/preview/__mocks__/global_mocks';

enableFetchMocks();

jest.mock('preview/util/init', () => ({
  fetchLibraryAssets: jest.fn(),
}));

const mockLibraryAsset1 = new LibraryAsset(
  'Asset 1',
  'path/to/assets',
  false,
  'Digital Twins',
  mockGitlabInstance,
);
mockLibraryAsset1.fullDescription = 'Library Asset 1 Description';

const mockLibraryAsset2 = new LibraryAsset(
  'Asset 2',
  'path/to/assets',
  false,
  'Digital Twins',
  mockGitlabInstance,
);
mockLibraryAsset2.fullDescription = 'Library Asset 2 Description';

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

describe('AssetLibrary Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    store.dispatch(setAssets([mockLibraryAsset1, mockLibraryAsset2]));
  });

  it.skip('renders loading spinner initially', async () => {
    render(
      <Provider store={store}>
        <AssetLibrary pathToAssets="path/to/assets" privateRepo={false} />
      </Provider>,
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it.skip('renders AssetLibrary with assets after loading', async () => {
    render(
      <Provider store={store}>
        <AssetLibrary pathToAssets="path/to/assets" privateRepo={false} />
      </Provider>,
    );

    await waitFor(() => {
      expect(
        screen.getByText('Library Asset 1 Description'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Library Asset 2 Description'),
      ).toBeInTheDocument();
    });
  });

  it.skip('filters assets based on filter input', async () => {
    render(
      <Provider store={store}>
        <AssetLibrary pathToAssets="path/to/assets" privateRepo={false} />
      </Provider>,
    );

    await waitFor(() => {
      expect(
        screen.getByText('Library Asset 1 Description'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Library Asset 2 Description'),
      ).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Asset 1' },
    });

    await waitFor(() => {
      expect(
        screen.getByText('Library Asset 1 Description'),
      ).toBeInTheDocument();
      expect(
        screen.queryByText('Library Asset 2 Description'),
      ).not.toBeInTheDocument();
    });
  });

  it.skip('displays error message if there is an error', async () => {
    const errorMessage = 'Error fetching assets';
    jest.spyOn(store, 'dispatch').mockImplementation(() => {
      throw new Error(errorMessage);
    });

    render(
      <Provider store={store}>
        <AssetLibrary pathToAssets="path/to/assets" privateRepo={false} />
      </Provider>,
    );

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });
});
