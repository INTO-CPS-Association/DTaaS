import DigitalTwin from 'model/backend/digitalTwin';
import { ExecutionStatus } from 'model/backend/interfaces/execution';
import {
  mockGitlabInstance,
  mockedIndexedDBService,
  setupBeforeEach,
  createDigitalTwin,
} from './testSetup';

describe('DigitalTwin - execution log and status updates', () => {
  let dt: DigitalTwin;

  beforeEach(() => {
    dt = createDigitalTwin();
    setupBeforeEach(dt);
  });

  afterEach(() => {
    mockGitlabInstance.getProjectId = jest.fn().mockReturnValue(1);
  });

  it('should update execution logs', async () => {
    const mockExecution = {
      id: 'exec1',
      dtName: 'test-DTName',
      pipelineId: 123,
      timestamp: Date.now(),
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    };
    const newJobLogs = [{ jobName: 'job1', log: 'log1' }];
    mockedIndexedDBService.getById.mockResolvedValue(mockExecution);

    await dt.updateExecutionLogs('exec1', newJobLogs);

    expect(mockedIndexedDBService.getById).toHaveBeenCalledWith('exec1');
    expect(mockedIndexedDBService.update).toHaveBeenCalledWith({
      ...mockExecution,
      jobLogs: newJobLogs,
    });
  });

  it('should handle database errors when updating execution logs', async () => {
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

    const newJobLogs = [{ jobName: 'job1', log: 'log1' }];

    await expect(dt.updateExecutionLogs('exec1', newJobLogs)).rejects.toThrow(
      'Update failed',
    );
  });

  it('should update instance job logs when executionId matches currentExecutionId', async () => {
    const mockExecution = {
      id: 'exec1',
      dtName: 'test-DTName',
      pipelineId: 123,
      timestamp: Date.now(),
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    };
    const newJobLogs = [{ jobName: 'job1', log: 'log1' }];
    mockedIndexedDBService.getById.mockResolvedValue(mockExecution);

    dt.currentExecutionId = 'exec1';
    await dt.updateExecutionLogs('exec1', newJobLogs);

    expect(dt.jobLogs).toEqual(newJobLogs);
  });

  it('should update execution status', async () => {
    const mockExecution = {
      id: 'exec1',
      dtName: 'test-DTName',
      pipelineId: 123,
      timestamp: Date.now(),
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    };
    mockedIndexedDBService.getById.mockResolvedValue(mockExecution);

    await dt.updateExecutionStatus('exec1', ExecutionStatus.COMPLETED);

    expect(mockedIndexedDBService.getById).toHaveBeenCalledWith('exec1');
    expect(mockedIndexedDBService.update).toHaveBeenCalledWith({
      ...mockExecution,
      status: ExecutionStatus.COMPLETED,
    });
  });

  it('should handle database errors when updating execution status', async () => {
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

    await expect(
      dt.updateExecutionStatus('exec1', ExecutionStatus.COMPLETED),
    ).rejects.toThrow('Update failed');
  });

  it('should update instance status when executionId matches currentExecutionId', async () => {
    const mockExecution = {
      id: 'exec1',
      dtName: 'test-DTName',
      pipelineId: 123,
      timestamp: Date.now(),
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    };
    mockedIndexedDBService.getById.mockResolvedValue(mockExecution);

    dt.currentExecutionId = 'exec1';
    await dt.updateExecutionStatus('exec1', ExecutionStatus.COMPLETED);

    expect(dt.lastExecutionStatus).toBe(ExecutionStatus.COMPLETED);
  });
});
