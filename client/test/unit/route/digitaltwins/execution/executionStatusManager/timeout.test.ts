import * as PipelineChecks from 'route/digitaltwins/execution/executionStatusManager';
import indexedDBService from 'database/executionHistoryDB';
import { ExecutionStatus } from 'model/backend/interfaces/execution';
import { mockDigitalTwin } from 'test/__mocks__/global_mocks';
import { createMockDTExecutionResult } from './testSetup';

jest.mock('model/backend/digitalTwin', () => ({
  DigitalTwin: jest.fn().mockImplementation(() => mockDigitalTwin),
  formatName: jest.fn(),
}));

jest.mock('route/digitaltwins/execution/executionStatusHandlers', () => ({
  ...jest.requireActual('route/digitaltwins/execution/executionStatusHandlers'),
  fetchJobLogs: jest.fn(),
  updatePipelineStateOnCompletion: jest.fn(),
}));

jest.mock('model/backend/gitlab/execution/pipelineCore', () => ({
  delay: jest.fn(),
  hasTimedOut: jest.fn(),
  getPollingInterval: jest.fn(() => 5000),
}));

jest.useFakeTimers();

describe('ExecutionStatusManager - handleTimeout', () => {
  const DTName = 'testName';
  const setButtonText = jest.fn();
  const setLogButtonDisabled = jest.fn();
  const dispatch = jest.fn();

  Object.defineProperty(AbortSignal, 'timeout', {
    value: jest.fn(),
    writable: false,
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('handles timeout', async () => {
    await PipelineChecks.handleTimeout(
      DTName,
      setButtonText,
      setLogButtonDisabled,
      dispatch,
    );

    expect(setButtonText).toHaveBeenCalled();
    expect(setLogButtonDisabled).toHaveBeenCalledWith(false);
  });

  it('handles timeout with executionId and updates IndexedDB', async () => {
    const executionId = 'test-execution-id';
    const mockExecution = createMockDTExecutionResult(
      executionId,
      DTName,
      123,
      ExecutionStatus.RUNNING,
    );

    const getByIdSpy = jest
      .spyOn(indexedDBService, 'getById')
      .mockResolvedValue(mockExecution);
    const updateSpy = jest
      .spyOn(indexedDBService, 'update')
      .mockResolvedValue(undefined);

    await PipelineChecks.handleTimeout(
      DTName,
      setButtonText,
      setLogButtonDisabled,
      dispatch,
      executionId,
    );

    expect(getByIdSpy).toHaveBeenCalledWith(executionId);
    expect(updateSpy).toHaveBeenCalledWith({
      ...mockExecution,
      status: ExecutionStatus.TIMEOUT,
    });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('updateExecutionStatus'),
      }),
    );
    expect(setButtonText).toHaveBeenCalledWith('Start');
    expect(setLogButtonDisabled).toHaveBeenCalledWith(false);

    getByIdSpy.mockRestore();
    updateSpy.mockRestore();
  });

  it('handles timeout with executionId when execution not found in IndexedDB', async () => {
    const executionId = 'test-execution-id';

    const getByIdSpy = jest
      .spyOn(indexedDBService, 'getById')
      .mockResolvedValue(null);
    const updateSpy = jest
      .spyOn(indexedDBService, 'update')
      .mockResolvedValue(undefined);

    await PipelineChecks.handleTimeout(
      DTName,
      setButtonText,
      setLogButtonDisabled,
      dispatch,
      executionId,
    );

    expect(getByIdSpy).toHaveBeenCalledWith(executionId);
    expect(updateSpy).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('updateExecutionStatus'),
      }),
    );

    getByIdSpy.mockRestore();
    updateSpy.mockRestore();
  });
});
