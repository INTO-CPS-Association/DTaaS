import {
  handleButtonClick,
  handleStart,
  handleStop,
} from 'preview/route/digitaltwins/execute/pipelineHandler';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';

describe('PipelineHandler', () => {
  const setButtonText = jest.fn();
  const digitalTwin = mockDigitalTwin;
  const setLogButtonDisabled = jest.fn();
  const dispatch = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('handles button click when button text is Start', async () => {
    const handleStart = jest.spyOn(
      require('preview/route/digitaltwins/execute/pipelineHandler'),
      'handleStart',
    );
    await handleButtonClick(
      'Start',
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
    );

    expect(handleStart).toHaveBeenCalled();

    handleStart.mockRestore();
  });

  it('handles button click when button text is Stop', async () => {
    const handleStop = jest.spyOn(
      require('preview/route/digitaltwins/execute/pipelineHandler'),
      'handleStop',
    );
    await handleButtonClick(
      'Stop',
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
    );

    expect(handleStop).toHaveBeenCalled();

    handleStop.mockRestore();
  });

  it('handles start when button text is Start', async () => {
    const updatePipelineState = jest.spyOn(
      require('preview/route/digitaltwins/execute/pipelineUtils'),
      'updatePipelineState',
    );
    const startPipeline = jest
      .spyOn(
        require('preview/route/digitaltwins/execute/pipelineUtils'),
        'startPipeline',
      )
      .mockResolvedValue('success'); // Mock resolvedValue
    const startPipelineStatusCheck = jest
      .spyOn(
        require('preview/route/digitaltwins/execute/pipelineChecks'),
        'startPipelineStatusCheck',
      )
      .mockResolvedValue('success');

    await handleStart(
      'Start',
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
    );

    expect(updatePipelineState).toHaveBeenCalledWith(digitalTwin, dispatch);
    expect(startPipeline).toHaveBeenCalledWith(
      digitalTwin,
      dispatch,
      setLogButtonDisabled,
    );
    expect(startPipelineStatusCheck).toHaveBeenCalled();

    updatePipelineState.mockRestore();
    startPipeline.mockRestore();
    startPipelineStatusCheck.mockRestore();
  });

  it('handles start when button text is Stop', async () => {
    await handleStart(
      'Stop',
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
    );

    expect(setButtonText).toHaveBeenCalledWith('Start');
  });

  it('handles stop and catches error', async () => {
    const updatePipelineStateOnStop = jest.spyOn(
      require('preview/route/digitaltwins/execute/pipelineUtils'),
      'updatePipelineStateOnStop',
    );

    const stopPipelines = jest
      .spyOn(
        require('preview/route/digitaltwins/execute/pipelineHandler'),
        'stopPipelines',
      )
      .mockRejectedValueOnce(new Error('error'));
    await handleStop(digitalTwin, setButtonText, dispatch);

    expect(dispatch).toHaveBeenCalled();
    expect(updatePipelineStateOnStop).toHaveBeenCalled();

    updatePipelineStateOnStop.mockRestore();
    stopPipelines.mockRestore();
  });
});
