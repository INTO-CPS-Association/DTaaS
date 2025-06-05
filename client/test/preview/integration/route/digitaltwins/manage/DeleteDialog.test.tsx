import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import DeleteDialog from 'preview/route/digitaltwins/manage/DeleteDialog';
import digitalTwinReducer, {
  setDigitalTwin,
} from 'preview/store/digitalTwin.slice';
import snackbarSlice from 'preview/store/snackbar.slice';
import DigitalTwin from 'preview/util/digitalTwin';
import { mockBackendInstance } from 'test/preview/__mocks__/global_mocks';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

const mockDigitalTwin = new DigitalTwin('Asset 1', mockBackendInstance);
mockDigitalTwin.delete = jest.fn().mockResolvedValue('Deleted successfully');

const store = configureStore({
  reducer: combineReducers({
    digitalTwin: digitalTwinReducer,
    snackbar: snackbarSlice,
  }),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

describe('DeleteDialog Integration Tests', () => {
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

  it('closes DeleteDialog on Cancel button click', async () => {
    const setShowDialog = jest.fn();

    render(
      <Provider store={store}>
        <DeleteDialog
          showDialog={true}
          setShowDialog={setShowDialog}
          name="Asset 1"
          onDelete={jest.fn()}
        />
      </Provider>,
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(setShowDialog).toHaveBeenCalledWith(false);
  });
});
