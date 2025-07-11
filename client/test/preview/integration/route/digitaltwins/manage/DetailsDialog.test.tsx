import * as React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import DetailsDialog from 'preview/route/digitaltwins/manage/DetailsDialog';
import assetsReducer, { setAssets } from 'preview/store/assets.slice';
import digitalTwinReducer, {
  setDigitalTwin,
} from 'preview/store/digitalTwin.slice';
import snackbarSlice from 'preview/store/snackbar.slice';
import fileSlice from 'preview/store/file.slice';
import libraryConfigFilesSlice from 'preview/store/libraryConfigFiles.slice';
import DigitalTwin from 'preview/util/digitalTwin';
import LibraryAsset from 'preview/util/libraryAsset';
import { mockBackendInstance } from 'test/__mocks__/global_mocks';
import LibraryManager from 'preview/util/libraryManager';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

const mockDigitalTwin = new DigitalTwin('Asset 1', mockBackendInstance);
mockDigitalTwin.fullDescription = 'Digital Twin Description';

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
    store.dispatch(setAssets([mockLibraryAsset]));
    store.dispatch(
      setDigitalTwin({ assetName: 'Asset 1', digitalTwin: mockDigitalTwin }),
    );
  };

  beforeEach(() => {
    setupTest();
  });

  afterEach(() => {
    jest.clearAllMocks();
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
      expect(screen.getByText('Digital Twin Description')).toBeInTheDocument();
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
      expect(screen.getByText('Library Asset Description')).toBeInTheDocument();
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
