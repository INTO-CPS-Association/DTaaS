import * as PipelineHandlers from 'route/digitaltwins/execution/executionButtonHandlers';
import * as PipelineCore from '@into-cps-association/dt-automation';
import { mockDigitalTwin } from 'test/__mocks__/global_mocks';
import { configureStore } from '@reduxjs/toolkit';
import {
  digitalTwinSlice as digitalTwinReducer,
  setDigitalTwin,
  DigitalTwinData,
  extractDataFromDigitalTwin,
  formatName,
} from '@into-cps-association/dt-automation';
import snackbarSlice from 'store/snackbar.slice';

jest.mock('@into-cps-association/dt-automation', () => ({
  ...jest.requireActual('@into-cps-association/dt-automation'),
  stopPipelines: jest.fn().mockResolvedValue({ success: true }),
}));

const store = configureStore({
  reducer: {
    digitalTwin: digitalTwinReducer,
    snackbar: snackbarSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

describe('PipelineHandler Integration Tests', () => {
  const digitalTwin = mockDigitalTwin;

  beforeEach(() => {
    jest.spyOn(mockDigitalTwin.backend, 'getProjectId').mockReturnValue(1);
    jest
      .spyOn(mockDigitalTwin.backend, 'getCommonProjectId')
      .mockReturnValue(2);
    // Convert DigitalTwin instance to DigitalTwinData using the adapter
    const digitalTwinData: DigitalTwinData =
      extractDataFromDigitalTwin(digitalTwin);
    store.dispatch(
      setDigitalTwin({
        assetName: 'mockedDTName',
        digitalTwin: digitalTwinData,
      }),
    );
  });

  it('handles button click when button text is Stop', async () => {
    const { dispatch } = store;

    await PipelineHandlers.handleButtonClick(
      'Start',
      jest.fn(),
      digitalTwin,
      jest.fn(),
      dispatch,
    );

    await PipelineHandlers.handleButtonClick(
      'Stop',
      jest.fn(),
      digitalTwin,
      jest.fn(),
      dispatch,
    );

    const snackbarItems = store.getState().snackbar.items;
    const lastItem = snackbarItems[snackbarItems.length - 1];
    expect(lastItem.message).toBe(
      'Execution stopped successfully for MockedDTName',
    );
    expect(lastItem.severity).toBe('warning');
  });

  it('handles start when button text is Stop', async () => {
    const setButtonText = jest.fn();
    const setLogButtonDisabled = jest.fn();
    const { dispatch } = store;

    await PipelineHandlers.handleStart(
      'Stop',
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
    );

    expect(setButtonText).toHaveBeenCalledWith('Start');
  });

  it('handles stop and catches error', async () => {
    const stopPipelinesMock = PipelineCore.stopPipelines as jest.Mock;
    stopPipelinesMock.mockResolvedValueOnce({
      success: false,
      error: new Error('error'),
    });

    const { dispatch } = store;

    await PipelineHandlers.handleStop(digitalTwin, jest.fn(), dispatch);

    const snackbarState = store.getState().snackbar;

    const { items } = snackbarState;
    expect(items[items.length - 1].message).toBe(
      `Execution stop failed for ${formatName(digitalTwin.DTName)}`,
    );

    stopPipelinesMock.mockReset();
  });
});
