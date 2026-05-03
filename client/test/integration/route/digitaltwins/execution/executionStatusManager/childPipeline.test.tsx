import * as PipelineChecks from 'route/digitaltwins/execution/executionStatusManager';
import * as PipelineCore from 'model/backend/gitlab/execution/pipelineCore';
import {
  setDigitalTwin,
  DigitalTwinData,
} from 'model/backend/state/digitalTwin.slice';
import { extractDataFromDigitalTwin } from 'model/backend/util/digitalTwinAdapter';
import { mockDigitalTwin } from 'test/__mocks__/global_mocks';
import { previewStore as store } from 'test/integration/integration.testUtil';

jest.useFakeTimers();

jest.mock('model/backend/gitlab/execution/pipelineCore', () => ({
  delay: jest.fn(),
  hasTimedOut: jest.fn(),
  getPollingInterval: jest.fn(() => 5000),
}));

describe('PipelineChecks - childPipeline', () => {
  const digitalTwin = mockDigitalTwin;

  const setButtonText = jest.fn();
  const setLogButtonDisabled = jest.fn();
  const dispatch = jest.fn();
  const startTime = Date.now();

  Object.defineProperty(AbortSignal, 'timeout', {
    value: jest.fn(),
    writable: false,
  });

  beforeEach(() => {
    const digitalTwinData: DigitalTwinData =
      extractDataFromDigitalTwin(digitalTwin);
    store.dispatch(
      setDigitalTwin({
        assetName: 'mockedDTName',
        digitalTwin: digitalTwinData,
      }),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('handles pipeline completion with failed status', async () => {
    const getPipelineJobsSpy = jest.spyOn(
      digitalTwin.backend,
      'getPipelineJobs',
    );
    getPipelineJobsSpy.mockResolvedValue([]);

    const mockFetchJobLogs = jest.fn().mockResolvedValue([]);

    jest.doMock('model/backend/gitlab/execution/logFetching', () => ({
      fetchJobLogs: mockFetchJobLogs,
    }));

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
      items: [
        {
          id: 0,
          message: 'Execution failed for MockedDTName',
          severity: 'error',
        },
      ],
      nextId: 1,
    };

    expect(snackbarState).toEqual(expectedSnackbarState);

    getPipelineJobsSpy.mockRestore();
    jest.dontMock('model/backend/gitlab/execution/logFetching');
  });

  it('checks child pipeline status and returns timeout', async () => {
    const completeParams = {
      setButtonText: jest.fn(),
      digitalTwin,
      setLogButtonDisabled: jest.fn(),
      dispatch: jest.fn(),
      startTime: Date.now(),
    };

    const handleTimeoutSpy = jest.spyOn(PipelineChecks, 'handleTimeout');
    handleTimeoutSpy.mockImplementation(() => Promise.resolve());

    const getPipelineStatusSpy = jest.spyOn(
      digitalTwin.backend,
      'getPipelineStatus',
    );
    getPipelineStatusSpy.mockResolvedValue('running');

    const hasTimedOutSpy = jest.spyOn(PipelineCore, 'hasTimedOut');
    hasTimedOutSpy.mockReturnValue(true);

    await PipelineChecks.checkChildPipelineStatus(completeParams);

    expect(handleTimeoutSpy).toHaveBeenCalled();

    handleTimeoutSpy.mockRestore();
    getPipelineStatusSpy.mockRestore();
    hasTimedOutSpy.mockRestore();
  });

  it('checks child pipeline status and returns running', async () => {
    const delaySpy = jest.spyOn(PipelineCore, 'delay');
    delaySpy.mockImplementation(() => Promise.resolve());

    const getPipelineStatusSpy = jest.spyOn(
      digitalTwin.backend,
      'getPipelineStatus',
    );
    getPipelineStatusSpy
      .mockResolvedValueOnce('running')
      .mockResolvedValue('success');

    const getPipelineJobsSpy = jest.spyOn(
      digitalTwin.backend,
      'getPipelineJobs',
    );
    getPipelineJobsSpy.mockResolvedValue([]);

    const hasTimedOutSpy = jest.spyOn(PipelineCore, 'hasTimedOut');
    hasTimedOutSpy.mockReturnValueOnce(false).mockReturnValue(true);

    await PipelineChecks.checkChildPipelineStatus({
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
      startTime,
    });

    expect(getPipelineStatusSpy).toHaveBeenCalled();
    expect(delaySpy).toHaveBeenCalled();

    delaySpy.mockRestore();
    getPipelineStatusSpy.mockRestore();
    getPipelineJobsSpy.mockRestore();
    hasTimedOutSpy.mockRestore();
  });
});
