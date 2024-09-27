import * as PipelineChecks from 'preview/route/digitaltwins/execute/pipelineChecks';
import * as PipelineUtils from 'preview/route/digitaltwins/execute/pipelineUtils';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';

jest.mock('util/gitlabDigitalTwin', () => ({
  DigitalTwin: jest.fn().mockImplementation(() => mockDigitalTwin),
  formatName: jest.fn(),
}));

jest.mock('preview/route/digitaltwins/execute/pipelineUtils', () => ({
  fetchJobLogs: jest.fn(),
  updatePipelineStateOnCompletion: jest.fn(),
}));

jest.useFakeTimers();

describe('PipelineChecks', () => {
  const DTName = 'testName';
  const setButtonText = jest.fn();
  const setLogButtonDisabled = jest.fn();
  const dispatch = jest.fn();
  const startTime = Date.now();
  const digitalTwin = mockDigitalTwin;
  const params = { setButtonText, digitalTwin, setLogButtonDisabled, dispatch };
  const pipelineId = 1;

  Object.defineProperty(AbortSignal, 'timeout', {
    value: jest.fn(),
    writable: false,
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('handles timeout', () => {
    PipelineChecks.handleTimeout(
      DTName,
      setButtonText,
      setLogButtonDisabled,
      dispatch,
    );

    expect(setButtonText).toHaveBeenCalled();
    expect(setLogButtonDisabled).toHaveBeenCalledWith(false);
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
      dispatch,
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
      dispatch,
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
      dispatch,
      startTime,
    });

    jest.advanceTimersByTime(5000);

    expect(handleTimeout).toHaveBeenCalled();
  });

  
  it('checks first pipeline status and returns running', async () => {
    const delay = jest.spyOn(PipelineChecks, 'delay');
    delay.mockImplementation(() => Promise.resolve());

    jest.spyOn(digitalTwin.gitlabInstance, 'getPipelineStatus').mockResolvedValue('running');
    jest.spyOn(PipelineChecks, 'hasTimedOut').mockReturnValueOnce(false).mockReturnValueOnce(true);

    await PipelineChecks.checkFirstPipelineStatus({
        setButtonText,
        digitalTwin,
        setLogButtonDisabled,
        dispatch,
        startTime,
    });

    expect(delay).toHaveBeenCalled();
});

  it('handles pipeline completion with failed status', async () => {
    const fetchJobLogs = jest.spyOn(PipelineUtils, 'fetchJobLogs');
    const updatePipelineStateOnCompletion = jest.spyOn(
      PipelineUtils,
      'updatePipelineStateOnCompletion',
    );
    await PipelineChecks.handlePipelineCompletion(
      pipelineId,
      digitalTwin,
      setButtonText,
      setLogButtonDisabled,
      dispatch,
      'failed',
    );

    expect(fetchJobLogs).toHaveBeenCalled();
    expect(updatePipelineStateOnCompletion).toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledTimes(1);
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
  
    const getPipelineStatusMock = jest.spyOn(digitalTwin.gitlabInstance, 'getPipelineStatus');
    getPipelineStatusMock.mockResolvedValueOnce('running').mockResolvedValue('success'); // First call returns 'running', then 'success'
  
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
