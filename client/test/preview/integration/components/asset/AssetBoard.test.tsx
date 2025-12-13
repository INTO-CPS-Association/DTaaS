import { act, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import AssetBoard from 'preview/components/asset/AssetBoard';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import assetsReducer, { setAssets } from 'preview/store/assets.slice';
import digitalTwinReducer, {
  setDigitalTwin,
  setShouldFetchDigitalTwins,
} from 'model/backend/state/digitalTwin.slice';
import executionHistoryReducer from 'model/backend/state/executionHistory.slice';
import snackbarSlice from 'store/snackbar.slice';
import {
  createMockDigitalTwinData,
  mockLibraryAsset,
} from 'test/preview/__mocks__/global_mocks';
import fileSlice, { addOrUpdateFile } from 'preview/store/file.slice';
import LibraryAsset from 'model/backend/libraryAsset';
import libraryConfigFilesSlice from 'preview/store/libraryConfigFiles.slice';
import { FileState } from 'model/backend/interfaces/sharedInterfaces';
import { storeResetAll } from 'test/preview/integration/integration.testUtil';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

jest.mock('model/backend/util/digitalTwinAdapter', () => {
  const adapterMocks = jest.requireActual(
    'test/preview/__mocks__/adapterMocks',
  );
  return adapterMocks.ADAPTER_MOCKS;
});
jest.mock('model/backend/util/init', () => {
  const adapterMocks = jest.requireActual(
    'test/preview/__mocks__/adapterMocks',
  );
  return adapterMocks.INIT_MOCKS;
});
jest.mock('model/backend/gitlab/instance', () => {
  const adapterMocks = jest.requireActual(
    'test/preview/__mocks__/adapterMocks',
  );
  return adapterMocks.GITLAB_MOCKS;
});

jest.useFakeTimers();

beforeAll(() => {});

afterAll(() => {});

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
    executionHistory: executionHistoryReducer,
    snackbar: snackbarSlice,
    files: fileSlice,
    libraryConfigFiles: libraryConfigFilesSlice,
  }),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
  preloadedState: {
    executionHistory: {
      entries: [],
      selectedExecutionId: null,
      loading: false,
      error: null,
    },
  },
});

describe('AssetBoard Integration Tests', () => {
  jest.setTimeout(30000);

  const setupTest = () => {
    storeResetAll();

    store.dispatch(setAssets(preSetItems));
    const digitalTwinData = createMockDigitalTwinData('Asset 1');
    store.dispatch(
      setDigitalTwin({
        assetName: 'Asset 1',
        digitalTwin: digitalTwinData,
      }),
    );
    store.dispatch(addOrUpdateFile(files[0]));
    store.dispatch(setShouldFetchDigitalTwins(true));
  };

  beforeEach(() => {
    setupTest();
  });

  afterEach(() => {
    storeResetAll();
    jest.clearAllTimers();
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
      expect(
        screen.queryByRole('button', { name: /Details/i }),
      ).not.toBeInTheDocument();
    });
  });
});
