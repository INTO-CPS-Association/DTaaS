import 'test/__mocks__/adapterMocks';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import ReconfigureDialog from 'route/digitaltwins/manage/ReconfigureDialog';
import assetsReducer from 'model/store/assets.slice';
import digitalTwinReducer, {
  setDigitalTwin,
} from 'model/backend/state/digitalTwin.slice';
import snackbarSlice, { showSnackbar } from 'store/snackbar.slice';
import fileSlice, { removeAllModifiedFiles } from 'model/store/file.slice';
import libraryConfigFilesSlice, {
  removeAllModifiedLibraryFiles,
} from 'model/store/libraryConfigFiles.slice';
import DigitalTwin from 'model/backend/digitalTwin';
import {
  mockBackendInstance,
  createMockDigitalTwinData,
} from 'test/__mocks__/global_mocks';
import { storeResetAll } from 'test/integration/integration.testUtil';

jest.mock('model/backend/util/digitalTwinAdapter', () => ({
  createDigitalTwinFromData: jest.fn().mockResolvedValue({
    DTName: 'Asset 1',
    DTAssets: {
      updateFileContent: jest.fn().mockResolvedValue(undefined),
      updateLibraryFileContent: jest.fn().mockResolvedValue(undefined),
    },
  }),
  extractDataFromDigitalTwin: jest.fn(),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

const mockDigitalTwin = new DigitalTwin('Asset 1', mockBackendInstance);
mockDigitalTwin.fullDescription = 'Digital Twin Description';

const initialState = {
  assets: { items: [] },
  digitalTwin: {
    assetName: 'Asset 1',
    digitalTwin: mockDigitalTwin,
    shouldFetchDigitalTwins: false,
  },
  snackbar: {},
  files: [],
  libraryConfigFiles: [],
  cart: { assets: [] },
};

const store = configureStore({
  reducer: combineReducers({
    assets: assetsReducer,
    digitalTwin: digitalTwinReducer,
    snackbar: snackbarSlice,
    files: fileSlice,
    libraryConfigFiles: libraryConfigFilesSlice,
    cart: (state = initialState.cart) => state,
  }),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

describe('ReconfigureDialog Integration Tests', () => {
  const renderReconfigureDialog = () =>
    render(
      <Provider store={store}>
        <ReconfigureDialog
          showDialog={true}
          setShowDialog={jest.fn()}
          name="Asset 1"
        />
      </Provider>,
    );

  const clickAndVerify = async (clickText: string, verifyText: string) => {
    fireEvent.click(screen.getByText(clickText));

    await waitFor(() => {
      expect(screen.getByText(verifyText)).toBeInTheDocument();
    });
  };

  const setupTest = () => {
    storeResetAll();

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

  it('renders ReconfigureDialog', async () => {
    renderReconfigureDialog();
    await waitFor(() => {
      expect(screen.getByText(/Reconfigure/i)).toBeInTheDocument();
    });
  });

  it('opens save confirmation dialog on save button click', async () => {
    renderReconfigureDialog();
    await clickAndVerify('Save', 'Are you sure you want to apply the changes?');
  });

  it('opens cancel confirmation dialog on cancel button click', async () => {
    renderReconfigureDialog();
    await clickAndVerify(
      'Cancel',
      'Are you sure you want to cancel? Changes will not be applied.',
    );
  });

  it('dispatches actions on confirm save', async () => {
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    renderReconfigureDialog();

    fireEvent.click(screen.getByText('Save'));
    fireEvent.click(screen.getByText('Yes'));

    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalledWith(
        showSnackbar({
          message: 'Asset 1 reconfigured successfully',
          severity: 'success',
        }),
      );
      expect(dispatchSpy).toHaveBeenCalledWith(removeAllModifiedFiles());
      expect(dispatchSpy).toHaveBeenCalledWith(removeAllModifiedLibraryFiles());
    });
  });

  it('dispatches actions on confirm cancel', async () => {
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    renderReconfigureDialog();

    fireEvent.click(screen.getByText('Cancel'));
    fireEvent.click(screen.getByText('Yes'));

    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalledWith(removeAllModifiedFiles());
      expect(dispatchSpy).toHaveBeenCalledWith(removeAllModifiedLibraryFiles());
    });
  });
});
