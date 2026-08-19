/* eslint-disable import/first */
jest.mock('@into-cps-association/dt-automation', () => ({
  ...jest.requireActual('@into-cps-association/dt-automation'),
  ...ADAPTER_MOCKS,
  ...INIT_MOCKS,
  ...GITLAB_MOCKS,
}));

import {
  ADAPTER_MOCKS,
  INIT_MOCKS,
  GITLAB_MOCKS,
} from 'test/__mocks__/adapterMocks';

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import DetailsDialog from 'route/digitaltwins/manage/DetailsDialog';
import {
  assetsSlice as assetsReducer,
  digitalTwinSlice as digitalTwinReducer,
  setDigitalTwin,
  fileSlice,
  libraryConfigFilesSlice,
} from '@into-cps-association/dt-automation';
import snackbarSlice from 'store/snackbar.slice';
import {
  mockLibraryAsset as baseMockLibraryAsset,
  createMockDigitalTwinData,
} from 'test/__mocks__/global_mocks';
import {
  setAssets,
  storeResetAll,
} from 'test/integration/integration.testUtil';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

const mockLibraryAsset = {
  ...baseMockLibraryAsset,
  path: 'path/to/asset',
  fullDescription: 'Library Asset Description',
};

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
