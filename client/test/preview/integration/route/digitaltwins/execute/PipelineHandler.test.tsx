import * as PipelineHandlers from 'preview/route/digitaltwins/execute/pipelineHandler';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';
import { setDigitalTwin } from 'preview/store/digitalTwin.slice';
import { SnackbarState } from 'preview/store/snackbar.slice';
import { formatName } from 'preview/util/gitlabDigitalTwin';
import { previewStore as store } from 'test/preview/integration/integration.testUtil';

describe('PipelineHandler Integration Tests', () => {
  const digitalTwin = mockDigitalTwin;

  beforeEach(() => {
    store.dispatch(setDigitalTwin({ assetName: 'mockedDTName', digitalTwin }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('handles button click when button text is Stop', async () => {
    await PipelineHandlers.handleButtonClick(
      'Start',
      jest.fn(),
      digitalTwin,
      jest.fn(),
      store.dispatch,
    );

    await PipelineHandlers.handleButtonClick(
      'Stop',
      jest.fn(),
      digitalTwin,
      jest.fn(),
      store.dispatch,
    );

    const snackbarState = store.getState().snackbar;

    const expectedSnackbarState = {
      open: true,
      message: 'Execution mockedStatus for MockedDTName',
      severity: 'error',
    };

    expect(snackbarState).toEqual(expectedSnackbarState);
  });

  it('handles start when button text is Stop', async () => {
    const setButtonText = jest.fn();
    const setLogButtonDisabled = jest.fn();

    await PipelineHandlers.handleStart(
      'Stop',
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      store.dispatch,
    );

    expect(setButtonText).toHaveBeenCalledWith('Start');
  });

  it('handles stop and catches error', async () => {
    const stopPipelinesMock = jest
      .spyOn(PipelineHandlers, 'stopPipelines')
      .mockRejectedValueOnce(new Error('error'));

    await PipelineHandlers.handleStop(digitalTwin, jest.fn(), store.dispatch);

    const snackbarState = store.getState().snackbar as SnackbarState;
    expect(snackbarState.message).toBe(
      `Execution stop failed for ${formatName(digitalTwin.DTName)}. Error: error`,
    );

    stopPipelinesMock.mockRestore();
  });
});
