import { act, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import AssetBoard from 'components/asset/AssetBoard';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import {
  assetsSlice as assetsReducer,
  digitalTwinSlice as digitalTwinReducer,
  setDigitalTwin,
  setShouldFetchDigitalTwins,
  executionHistorySlice as executionHistoryReducer,
  fileSlice,
  addOrUpdateFile,
  LibraryAsset,
  libraryConfigFilesSlice,
  FileState,
} from '@into-cps-association/dt-automation';
import snackbarSlice from 'store/snackbar.slice';
import {
  createMockDigitalTwinData,
  mockLibraryAsset,
} from 'test/__mocks__/global_mocks';
import {
  setAssets,
  storeResetAll,
} from 'test/integration/integration.testUtil';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

jest.mock('@into-cps-association/dt-automation', () => {
  const actual = jest.requireActual('@into-cps-association/dt-automation');
  const adapterMocks = jest.requireActual('test/__mocks__/adapterMocks');
  return {
    ...actual,
    ...adapterMocks.ADAPTER_MOCKS,
    ...adapterMocks.INIT_MOCKS,
    ...adapterMocks.GITLAB_MOCKS,
  };
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
