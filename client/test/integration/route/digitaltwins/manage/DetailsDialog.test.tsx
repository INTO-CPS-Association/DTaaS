/* eslint-disable import/first */
jest.mock('model/backend/util/digitalTwinAdapter', () => ADAPTER_MOCKS);
jest.mock('model/backend/util/init', () => INIT_MOCKS);
jest.mock('model/backend/gitlab/instance', () => GITLAB_MOCKS);

import {
  ADAPTER_MOCKS,
  INIT_MOCKS,
  GITLAB_MOCKS,
} from 'test/__mocks__/adapterMocks';

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import DetailsDialog from 'route/digitaltwins/manage/DetailsDialog';
import assetsReducer, { setAssets } from 'model/store/assets.slice';
import digitalTwinReducer, {
  setDigitalTwin,
} from 'model/backend/state/digitalTwin.slice';
import snackbarSlice from 'store/snackbar.slice';
import fileSlice from 'model/store/file.slice';
import libraryConfigFilesSlice from 'model/store/libraryConfigFiles.slice';
import LibraryAsset from 'model/backend/libraryAsset';
import {
  mockBackendInstance,
  createMockDigitalTwinData,
} from 'test/__mocks__/global_mocks';
import LibraryManager from 'model/backend/libraryManager';
import { storeResetAll } from 'test/integration/integration.testUtil';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

const mockLibraryManager = new LibraryManager('Asset 1', mockBackendInstance);

const mockLibraryAsset = new LibraryAsset(
  mockLibraryManager,
  'path/to/asset',
  true,
  'Digital Twins',
);
mockLibraryAsset.fullDescription = 'Library Asset Description';

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

describe('DetailsDialog Integration Tests', () => {
  const setupTest = () => {
    storeResetAll();

    store.dispatch(setAssets([mockLibraryAsset]));
    const digitalTwinData = createMockDigitalTwinData('Asset 1');
    store.dispatch(
      setDigitalTwin({ assetName: 'Asset 1', digitalTwin: digitalTwinData }),
    );
  };

  beforeEach(() => {
    setupTest();
  });

  afterEach(() => {
    storeResetAll();
    jest.clearAllTimers();
  });

  it('renders DetailsDialog with Digital Twin description', async () => {
    render(
      <Provider store={store}>
        <DetailsDialog
          showDialog={true}
          setShowDialog={jest.fn()}
          name="Asset 1"
          isPrivate={false}
          library={false}
        />
      </Provider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Test README')).toBeInTheDocument();
    });
  });

  it('renders DetailsDialog with Library Asset description', async () => {
    render(
      <Provider store={store}>
        <DetailsDialog
          showDialog={true}
          setShowDialog={jest.fn()}
          name="Asset 1"
          isPrivate={true}
          library={true}
          path="path/to/asset"
        />
      </Provider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Close/i }),
      ).toBeInTheDocument();
    });
  });

  it('closes DetailsDialog on Close button click', async () => {
    const setShowDialog = jest.fn();

    render(
      <Provider store={store}>
        <DetailsDialog
          showDialog={true}
          setShowDialog={setShowDialog}
          name="Asset 1"
          isPrivate={false}
          library={false}
        />
      </Provider>,
    );

    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    expect(setShowDialog).toHaveBeenCalledWith(false);
  });
});
