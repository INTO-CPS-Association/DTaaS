import DigitalTwin from 'model/backend/digitalTwin';
import { mockBackendAPI } from 'test/__mocks__/global_mocks';
import { ExecutionStatus } from 'model/backend/interfaces/execution';
import {
  mockGitlabInstance,
  mockedIndexedDBService,
  setupBeforeEach,
  createDigitalTwin,
} from './testSetup';

describe('DigitalTwin - stop', () => {
  let dt: DigitalTwin;

  beforeEach(() => {
    dt = createDigitalTwin();
    setupBeforeEach(dt);
  });

  afterEach(() => {
    mockGitlabInstance.getProjectId = jest.fn().mockReturnValue(1);
  });

  it('should stop the parent pipeline and update status', async () => {
    (mockBackendAPI.cancelPipeline as jest.Mock).mockResolvedValue({});
    dt.pipelineId = 123;

    await dt.stop(1, 'parentPipeline');

    expect(mockBackendAPI.cancelPipeline).toHaveBeenCalled();
    expect(dt.lastExecutionStatus).toBe(ExecutionStatus.CANCELED);
  });

  it('should handle database errors when updating execution during stop', async () => {
    const mockExecution = {
      id: 'exec1',
      dtName: 'test-DTName',
      pipelineId: 123,
      timestamp: Date.now(),
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    };
    mockedIndexedDBService.getById.mockResolvedValue(mockExecution);
    mockedIndexedDBService.update.mockRejectedValue(new Error('Update failed'));
    (mockBackendAPI.cancelPipeline as jest.Mock).mockResolvedValue({});

    dt.currentExecutionId = 'exec1';
    dt.pipelineId = 123;

    await dt.stop(1, 'parentPipeline');

    expect(dt.lastExecutionStatus).toBe(ExecutionStatus.ERROR);
    expect(dt.backend.logs).toContainEqual(
      expect.objectContaining({ status: 'error', DTName: 'test-DTName' }),
    );
  });

  it('should stop the child pipeline and update status', async () => {
    (mockBackendAPI.cancelPipeline as jest.Mock).mockResolvedValue({});

    await dt.stop(1, 'childPipeline');

    expect(mockBackendAPI.cancelPipeline).toHaveBeenCalled();
    expect(dt.lastExecutionStatus).toBe(ExecutionStatus.CANCELED);
  });

  it('should handle stop error', async () => {
    (mockBackendAPI.cancelPipeline as jest.Mock).mockRejectedValue(
      new Error('Stop failed'),
    );
    dt.pipelineId = 123;

    await dt.stop(1, 'parentPipeline');

    expect(dt.lastExecutionStatus).toBe(ExecutionStatus.ERROR);
  });

  it('should stop a specific execution by ID', async () => {
    const mockExecution = {
      id: 'exec1',
      dtName: 'test-DTName',
      pipelineId: 123,
      timestamp: Date.now(),
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    };
    mockedIndexedDBService.getById.mockResolvedValue(mockExecution);
    (mockBackendAPI.cancelPipeline as jest.Mock).mockResolvedValue({});

    await dt.stop(1, 'parentPipeline', 'exec1');

    expect(mockedIndexedDBService.getById).toHaveBeenCalledWith('exec1');
    expect(mockBackendAPI.cancelPipeline).toHaveBeenCalledWith(1, 123);
    expect(mockedIndexedDBService.update).toHaveBeenCalledWith({
      ...mockExecution,
      status: ExecutionStatus.CANCELED,
    });
  });

  it('should stop a child pipeline for a specific execution by ID', async () => {
    const mockExecution = {
      id: 'exec1',
      dtName: 'test-DTName',
      pipelineId: 123,
      timestamp: Date.now(),
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    };
    mockedIndexedDBService.getById.mockResolvedValue(mockExecution);
    (mockBackendAPI.cancelPipeline as jest.Mock).mockResolvedValue({});

    await dt.stop(1, 'childPipeline', 'exec1');

    expect(mockedIndexedDBService.getById).toHaveBeenCalledWith('exec1');
    expect(mockBackendAPI.cancelPipeline).toHaveBeenCalledWith(1, 124);
    expect(mockedIndexedDBService.update).toHaveBeenCalledWith({
      ...mockExecution,
      status: ExecutionStatus.CANCELED,
    });
  });
});
