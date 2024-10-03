import * as PipelineHandlers from 'preview/route/digitaltwins/execute/pipelineHandler';
import * as PipelineUtils from 'preview/route/digitaltwins/execute/pipelineUtils';
import * as PipelineChecks from 'preview/route/digitaltwins/execute/pipelineChecks';
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
    const handleStart = jest.spyOn(PipelineHandlers, 'handleStart');
    await PipelineHandlers.handleButtonClick(
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
    const handleStop = jest.spyOn(PipelineHandlers, 'handleStop');
    await PipelineHandlers.handleButtonClick(
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
      PipelineUtils,
      'updatePipelineState',
    );
    const startPipeline = jest.spyOn(PipelineUtils, 'startPipeline');
    const startPipelineStatusCheck = jest.spyOn(
      PipelineChecks,
      'startPipelineStatusCheck',
    );

    await PipelineHandlers.handleStart(
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
    const updatePipelineStateOnStop = jest.spyOn(
      PipelineUtils,
      'updatePipelineStateOnStop',
    );

    const stopPipelines = jest
      .spyOn(PipelineHandlers, 'stopPipelines')
      .mockRejectedValueOnce(new Error('error'));
    await PipelineHandlers.handleStop(digitalTwin, setButtonText, dispatch);

    expect(dispatch).toHaveBeenCalled();
    expect(updatePipelineStateOnStop).toHaveBeenCalled();

    updatePipelineStateOnStop.mockRestore();
    stopPipelines.mockRestore();
  });
});
