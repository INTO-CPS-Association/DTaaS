import 'test/__mocks__/adapterMocks';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import DeleteDialog from 'route/digitaltwins/manage/DeleteDialog';
import {
  digitalTwinSlice as digitalTwinReducer,
  setDigitalTwin,
  DigitalTwin,
} from '@into-cps-association/dt-automation';
import snackbarSlice from 'store/snackbar.slice';
import {
  mockBackendInstance,
  createMockDigitalTwinData,
} from 'test/__mocks__/global_mocks';
import { storeResetAll } from 'test/integration/integration.testUtil';

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
