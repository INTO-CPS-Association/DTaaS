import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit';
import * as PipelineChecks from 'preview/route/digitaltwins/execute/pipelineChecks';
import * as PipelineUtils from 'preview/route/digitaltwins/execute/pipelineUtils';
import digitalTwinReducer, { setDigitalTwin } from 'store/digitalTwin.slice';
import snackbarSlice from 'store/snackbar.slice';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';

const store = configureStore({
  reducer: {
    digitalTwin: digitalTwinReducer,
    snackbar: snackbarSlice,
  },
  middleware: getDefaultMiddleware({
    serializableCheck: false,
  }),
});

jest.useFakeTimers();

jest.mock('preview/route/digitaltwins/execute/pipelineUtils', () => ({
  fetchJobLogs: jest.fn(),
  updatePipelineStateOnCompletion: jest.fn(),
}));

describe('PipelineChecks', () => {
  const digitalTwin = mockDigitalTwin;

  const setButtonText = jest.fn();
  const setLogButtonDisabled = jest.fn();
  const dispatch = jest.fn();
  const startTime = Date.now();
  const params = { setButtonText, digitalTwin, setLogButtonDisabled, dispatch };

  Object.defineProperty(AbortSignal, 'timeout', {
    value: jest.fn(),
    writable: false,
  });

  beforeEach(() => {
    store.dispatch(setDigitalTwin({ assetName: 'mockedDTName', digitalTwin }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('handles timeout', () => {
    PipelineChecks.handleTimeout(
      digitalTwin.DTName,
      jest.fn(),
      jest.fn(),
      store.dispatch,
    );

    const snackbarState = store.getState().snackbar;

    const expectedSnackbarState = {
      open: true,
      message: 'Execution timed out for MockedDTName',
      severity: 'error',
    };

    expect(snackbarState).toEqual(expectedSnackbarState);
  });

  it('starts pipeline status check', async () => {
    const checkFirstPipelineStatusSpy = jest
      .spyOn(PipelineChecks, 'checkFirstPipelineStatus')
      .mockImplementation(() => Promise.resolve());

    jest.spyOn(global.Date, 'now').mockReturnValue(startTime);

    await PipelineChecks.startPipelineStatusCheck(params);

    expect(checkFirstPipelineStatusSpy).toHaveBeenCalled();
  });

  it('checks first pipeline status and returns success', async () => {
    const checkSecondPipelineStatus = jest.spyOn(
      PipelineChecks,
      'checkSecondPipelineStatus',
    );

    jest
      .spyOn(digitalTwin.gitlabInstance, 'getPipelineStatus')
      .mockResolvedValue('success');
    await PipelineChecks.checkFirstPipelineStatus({
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch: store.dispatch,
      startTime,
    });

    expect(checkSecondPipelineStatus).toHaveBeenCalled();
  });

  it('checks first pipeline status and returns failed', async () => {
    const updatePipelineStateOnCompletion = jest.spyOn(
      PipelineUtils,
      'updatePipelineStateOnCompletion',
    );

    jest
      .spyOn(digitalTwin.gitlabInstance, 'getPipelineStatus')
      .mockResolvedValue('failed');
    await PipelineChecks.checkFirstPipelineStatus({
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch: store.dispatch,
      startTime,
    });

    expect(updatePipelineStateOnCompletion).toHaveBeenCalled();
  });

  it('checks first pipeline status and returns timeout', async () => {
    const handleTimeout = jest.spyOn(PipelineChecks, 'handleTimeout');

    jest
      .spyOn(digitalTwin.gitlabInstance, 'getPipelineStatus')
      .mockResolvedValue('running');
    jest.spyOn(PipelineChecks, 'hasTimedOut').mockReturnValue(true);
    await PipelineChecks.checkFirstPipelineStatus({
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch: store.dispatch,
      startTime,
    });

    jest.advanceTimersByTime(5000);

    expect(handleTimeout).toHaveBeenCalled();
  });

  it('checks first pipeline status and returns running', async () => {
    const delay = jest.spyOn(PipelineChecks, 'delay');
    delay.mockImplementation(() => Promise.resolve());

    jest
      .spyOn(digitalTwin.gitlabInstance, 'getPipelineStatus')
      .mockResolvedValue('running');
    jest
      .spyOn(PipelineChecks, 'hasTimedOut')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    await PipelineChecks.checkFirstPipelineStatus({
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch: store.dispatch,
      startTime,
    });

    expect(delay).toHaveBeenCalled();
  });

  it('handles pipeline completion with failed status', async () => {
    await PipelineChecks.handlePipelineCompletion(
      1,
      digitalTwin,
      jest.fn(),
      jest.fn(),
      store.dispatch,
      'failed',
    );

    const snackbarState = store.getState().snackbar;

    const expectedSnackbarState = {
      open: true,
      message: 'Execution failed for MockedDTName',
      severity: 'error',
    };

    expect(snackbarState).toEqual(expectedSnackbarState);
  });

  it('checks second pipeline status and returns timeout', async () => {
    const completeParams = {
      setButtonText: jest.fn(),
      digitalTwin,
      setLogButtonDisabled: jest.fn(),
      dispatch: jest.fn(),
      startTime: Date.now(),
    };
    const handleTimeout = jest.spyOn(PipelineChecks, 'handleTimeout');

    jest
      .spyOn(digitalTwin.gitlabInstance, 'getPipelineStatus')
      .mockResolvedValue('running');
    jest.spyOn(PipelineChecks, 'hasTimedOut').mockReturnValue(true);

    await PipelineChecks.checkSecondPipelineStatus(completeParams);

    expect(handleTimeout).toHaveBeenCalled();
  });

  it('checks second pipeline status and returns running', async () => {
    const delay = jest.spyOn(PipelineChecks, 'delay');
    delay.mockImplementation(() => Promise.resolve());

    const getPipelineStatusMock = jest.spyOn(
      digitalTwin.gitlabInstance,
      'getPipelineStatus',
    );
    getPipelineStatusMock
      .mockResolvedValueOnce('running')
      .mockResolvedValue('success');

    await PipelineChecks.checkSecondPipelineStatus({
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
      startTime,
    });

    expect(getPipelineStatusMock).toHaveBeenCalled();
    getPipelineStatusMock.mockRestore();
  });
});
