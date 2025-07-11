import * as React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import ReconfigureDialog from 'preview/route/digitaltwins/manage/ReconfigureDialog';
import assetsReducer from 'preview/store/assets.slice';
import digitalTwinReducer, {
  setDigitalTwin,
} from 'preview/store/digitalTwin.slice';
import snackbarSlice, { showSnackbar } from 'preview/store/snackbar.slice';
import fileSlice, { removeAllModifiedFiles } from 'preview/store/file.slice';
import libraryConfigFilesSlice, {
  removeAllModifiedLibraryFiles,
} from 'preview/store/libraryConfigFiles.slice';
import DigitalTwin from 'preview/util/digitalTwin';
import { mockBackendInstance } from 'test/__mocks__/global_mocks';

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
  const setupTest = () => {
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

  it('renders ReconfigureDialog', async () => {
    render(
      <Provider store={store}>
        <ReconfigureDialog
          showDialog={true}
          setShowDialog={jest.fn()}
          name="Asset 1"
        />
      </Provider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Reconfigure/i)).toBeInTheDocument();
    });
  });

  it('opens save confirmation dialog on save button click', async () => {
    render(
      <Provider store={store}>
        <ReconfigureDialog
          showDialog={true}
          setShowDialog={jest.fn()}
          name="Asset 1"
        />
      </Provider>,
    );

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(
        screen.getByText('Are you sure you want to apply the changes?'),
      ).toBeInTheDocument();
    });
  });

  it('opens cancel confirmation dialog on cancel button click', async () => {
    render(
      <Provider store={store}>
        <ReconfigureDialog
          showDialog={true}
          setShowDialog={jest.fn()}
          name="Asset 1"
        />
      </Provider>,
    );

    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(
        screen.getByText(/Are you sure you want to cancel?/i),
      ).toBeInTheDocument();
    });
  });

  it('dispatches actions on confirm save', async () => {
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    render(
      <Provider store={store}>
        <ReconfigureDialog
          showDialog={true}
          setShowDialog={jest.fn()}
          name="Asset 1"
        />
      </Provider>,
    );

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

    render(
      <Provider store={store}>
        <ReconfigureDialog
          showDialog={true}
          setShowDialog={jest.fn()}
          name="Asset 1"
        />
      </Provider>,
    );

    fireEvent.click(screen.getByText('Cancel'));
    fireEvent.click(screen.getByText('Yes'));

    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalledWith(removeAllModifiedFiles());
      expect(dispatchSpy).toHaveBeenCalledWith(removeAllModifiedLibraryFiles());
    });
  });
});
