import * as PipelineHandlers from 'route/digitaltwins/execution/executionButtonHandlers';
import * as PipelineUtils from 'route/digitaltwins/execution/executionStatusHandlers';
import * as PipelineChecks from 'route/digitaltwins/execution/executionStatusManager';
import * as PipelineCore from 'model/backend/gitlab/execution/pipelineCore';
import { mockDigitalTwin } from 'test/__mocks__/global_mocks';
import { PipelineHandlerDispatch } from 'route/digitaltwins/execution/executionButtonHandlers';
import { fetchExecutionHistory } from 'model/backend/state/executionHistory.slice';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

jest.mock('route/digitaltwins/execution/executionStatusManager', () => ({
  startPipelineStatusCheck: jest.fn(),
}));

jest.mock('model/backend/gitlab/execution/pipelineCore', () => ({
  stopPipelines: jest.fn(),
}));

jest.mock('model/backend/state/executionHistory.slice', () => ({
  __esModule: true,
  default: jest.fn((state = {}) => state),
  fetchExecutionHistory: jest.fn(),
  setStorageService: jest.fn(),
  updateExecutionStatus: jest.fn(),
  setSelectedExecutionId: jest.fn(),
}));

describe('ExecutionButtonHandlers', () => {
  const setButtonText = jest.fn();
  const digitalTwin = mockDigitalTwin;
  const setLogButtonDisabled = jest.fn();
  const dispatch: PipelineHandlerDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (PipelineCore.stopPipelines as jest.Mock).mockResolvedValue({
      success: true,
    });
    (fetchExecutionHistory as jest.Mock).mockReturnValue({
      type: 'executionHistory/fetch',
    });
  });

  it('handles button click when button text is Start', async () => {
    const handleStart = jest.spyOn(PipelineHandlers, 'handleStart');
    (PipelineCore.stopPipelines as jest.Mock).mockResolvedValue({
      success: true,
    });

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
    PipelineHandlers.handleButtonClick(
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
    (PipelineCore.stopPipelines as jest.Mock).mockResolvedValue({
      success: true,
    });

    const updatePipelineState = jest.spyOn(
      PipelineUtils,
      'updatePipelineState',
    );
    const startPipeline = jest.spyOn(PipelineUtils, 'startPipeline');

    const startPipelineStatusCheck =
      PipelineChecks.startPipelineStatusCheck as jest.Mock;

    startPipeline.mockResolvedValue('test-execution-id');

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

    (PipelineCore.stopPipelines as jest.Mock).mockResolvedValue({
      success: false,
      error: new Error('error'),
    });
    await PipelineHandlers.handleStop(digitalTwin, setButtonText, dispatch);

    expect(dispatch).toHaveBeenCalled();
    expect(updatePipelineStateOnStop).toHaveBeenCalled();

    updatePipelineStateOnStop.mockRestore();
  });

  it('handles stop with execution ID', async () => {
    const updatePipelineStateOnStop = jest.spyOn(
      PipelineUtils,
      'updatePipelineStateOnStop',
    );
    (PipelineCore.stopPipelines as jest.Mock).mockResolvedValue({
      success: true,
    });

    const stopPipelines = jest.spyOn(PipelineCore, 'stopPipelines');
    const executionId = '123';
    await PipelineHandlers.handleStop(
      digitalTwin,
      setButtonText,
      dispatch,
      executionId,
    );

    expect(dispatch).toHaveBeenCalled();
    expect(updatePipelineStateOnStop).toHaveBeenCalled();
    expect(stopPipelines).toHaveBeenCalled();

    updatePipelineStateOnStop.mockRestore();
    stopPipelines.mockRestore();
  });

  it('handles stop successfully and dispatches success notification', async () => {
    const updatePipelineStateOnStop = jest.spyOn(
      PipelineUtils,
      'updatePipelineStateOnStop',
    );

    (PipelineCore.stopPipelines as jest.Mock).mockResolvedValue({
      success: true,
    });

    await PipelineHandlers.handleStop(digitalTwin, setButtonText, dispatch);

    expect(dispatch).toHaveBeenCalledWith({
      type: 'snackbar/showSnackbar',
      payload: {
        message: expect.stringContaining('stopped successfully'),
        severity: 'warning',
      },
    });
    expect(updatePipelineStateOnStop).toHaveBeenCalled();

    updatePipelineStateOnStop.mockRestore();
  });
  it('handles start with successful execution and fetches history', async () => {
    const updatePipelineState = jest.spyOn(
      PipelineUtils,
      'updatePipelineState',
    );
    const startPipeline = jest.spyOn(PipelineUtils, 'startPipeline');
    const startPipelineStatusCheck =
      PipelineChecks.startPipelineStatusCheck as jest.Mock;

    const mockExecutionId = 'test-execution-id';
    startPipeline.mockResolvedValue(mockExecutionId);

    await PipelineHandlers.handleStart(
      'Start',
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
    );

    expect(fetchExecutionHistory).toHaveBeenCalledWith(digitalTwin.DTName);

    expect(dispatch).toHaveBeenCalledWith({
      type: 'executionHistory/fetch',
    });

    expect(startPipelineStatusCheck).toHaveBeenCalledWith(
      expect.objectContaining({
        setButtonText,
        digitalTwin,
        setLogButtonDisabled,
        dispatch,
        executionId: mockExecutionId,
      }),
    );

    updatePipelineState.mockRestore();
    startPipeline.mockRestore();
  });

  it('handles start with executionId when button text is Stop', async () => {
    const handleStop = jest.spyOn(PipelineHandlers, 'handleStop');
    const executionId = 'existing-execution-id';

    (PipelineCore.stopPipelines as jest.Mock).mockResolvedValue({
      success: true,
    });

    await PipelineHandlers.handleStart(
      'Stop',
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
      executionId,
    );

    expect(setButtonText).toHaveBeenCalledWith('Start');
    expect(handleStop).toHaveBeenCalledWith(
      digitalTwin,
      setButtonText,
      dispatch,
      executionId,
    );

    handleStop.mockRestore();
  });

  it('handles start without executionId when button text is Stop', async () => {
    const handleStop = jest.spyOn(PipelineHandlers, 'handleStop');

    (PipelineCore.stopPipelines as jest.Mock).mockResolvedValue({
      success: true,
    });

    await PipelineHandlers.handleStart(
      'Stop',
      setButtonText,
      digitalTwin,
      setLogButtonDisabled,
      dispatch,
    );

    expect(setButtonText).toHaveBeenCalledWith('Start');
    expect(handleStop).toHaveBeenCalledWith(
      digitalTwin,
      setButtonText,
      dispatch,
    );

    handleStop.mockRestore();
  });
});
