import {
  checkFirstPipelineStatus,
  checkSecondPipelineStatus,
  handlePipelineCompletion,
  handleTimeout,
  startPipelineStatusCheck,
} from 'preview/route/digitaltwins/execute/pipelineChecks';
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
    handleTimeout(DTName, setButtonText, setLogButtonDisabled, dispatch);

    expect(setButtonText).toHaveBeenCalled();
    expect(setLogButtonDisabled).toHaveBeenCalledWith(false);
  });

  it('starts pipeline status check', async () => {
    const checkFirstPipelineStatus = jest.spyOn(
      require('preview/route/digitaltwins/execute/pipelineChecks'),
      'checkFirstPipelineStatus',
    );

    jest.spyOn(global.Date, 'now').mockReturnValue(startTime);

    await startPipelineStatusCheck(params);

    expect(checkFirstPipelineStatus).toHaveBeenCalled();
  });

  it('checks first pipeline status and returns success', async () => {
    const checkSecondPipelineStatus = jest.spyOn(
      require('preview/route/digitaltwins/execute/pipelineChecks'),
      'checkSecondPipelineStatus',
    );

    jest
      .spyOn(digitalTwin.gitlabInstance, 'getPipelineStatus')
      .mockResolvedValue('success');
    await checkFirstPipelineStatus({
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
      require('preview/route/digitaltwins/execute/pipelineUtils'),
      'updatePipelineStateOnCompletion',
    );

    jest
      .spyOn(digitalTwin.gitlabInstance, 'getPipelineStatus')
      .mockResolvedValue('failed');
    await checkFirstPipelineStatus({
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
      startTime,
    });

    expect(updatePipelineStateOnCompletion).toHaveBeenCalled();
  });

  it('checks first pipeline status and returns timeout', async () => {
    const handleTimeout = jest.spyOn(
      require('preview/route/digitaltwins/execute/pipelineChecks'),
      'handleTimeout',
    );

    jest
      .spyOn(digitalTwin.gitlabInstance, 'getPipelineStatus')
      .mockResolvedValue('running');
    jest
      .spyOn(
        require('preview/route/digitaltwins/execute/pipelineChecks'),
        'hasTimedOut',
      )
      .mockReturnValue(true);
    await checkFirstPipelineStatus({
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
      startTime,
    });

    jest.advanceTimersByTime(5000);

    expect(handleTimeout).toHaveBeenCalled();
  });

  /*
  it('checks first pipeline status and returns running', async () => {
    const delay = jest.spyOn(require('preview/route/digitaltwins/execute/pipelineChecks'), 'delay');

    jest.spyOn(digitalTwin.gitlabInstance, 'getPipelineStatus').mockResolvedValue('running');
    jest.spyOn(require('preview/route/digitaltwins/execute/pipelineChecks'), 'hasTimedOut').mockReturnValueOnce(false).mockReturnValueOnce(true);

    await checkFirstPipelineStatus({
        setButtonText,
        digitalTwin,
        setLogButtonDisabled,
        dispatch,
        startTime,
    });

    expect(delay).toHaveBeenCalled();
    expect(checkFirstPipelineStatus).toHaveBeenCalled();

  
    // Verifica che la seconda chiamata restituisca il risultato mockato
});
*/

  it('handles pipeline completion with failed status', async () => {
    const fetchJobLogs = jest.spyOn(
      require('preview/route/digitaltwins/execute/pipelineUtils'),
      'fetchJobLogs',
    );
    const updatePipelineStateOnCompletion = jest.spyOn(
      require('preview/route/digitaltwins/execute/pipelineUtils'),
      'updatePipelineStateOnCompletion',
    );
    await handlePipelineCompletion(
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
    const params = {
      setButtonText: jest.fn(),
      digitalTwin: digitalTwin,
      setLogButtonDisabled: jest.fn(),
      dispatch: jest.fn(),
      startTime: Date.now(), // Un timestamp come esempio
    };
    const handleTimeout = jest.spyOn(
      require('preview/route/digitaltwins/execute/pipelineChecks'),
      'handleTimeout',
    );

    jest
      .spyOn(digitalTwin.gitlabInstance, 'getPipelineStatus')
      .mockResolvedValue('running');
    jest
      .spyOn(
        require('preview/route/digitaltwins/execute/pipelineChecks'),
        'hasTimedOut',
      )
      .mockReturnValue(true);

    await checkSecondPipelineStatus(params);

    expect(handleTimeout).toHaveBeenCalled();
  });

  /*
  it('checks second pipeline status and returns running', async () => {
    const delay = jest.spyOn(require('preview/route/digitaltwins/execute/pipelineChecks'), 'delay');
    delay.mockImplementation(() => Promise.resolve()); // Mock delay to immediately resolve
  
    const getPipelineStatusMock = jest.spyOn(digitalTwin.gitlabInstance, 'getPipelineStatus');
    getPipelineStatusMock.mockResolvedValueOnce('running').mockResolvedValue('success'); // First call returns 'running', then 'success'
  
    await checkSecondPipelineStatus({
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
      startTime,
    });
  
    //expect(delay).toHaveBeenCalled();
    expect(getPipelineStatusMock).toHaveBeenCalled(); // Ensure it was called again after delay
    expect(checkSecondPipelineStatus).toHaveBeenCalled(); // Verify recursive call behavior
  
    getPipelineStatusMock.mockRestore();
  });
  */
});
