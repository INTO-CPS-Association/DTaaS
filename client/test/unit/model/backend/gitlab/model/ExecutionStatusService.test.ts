import { DTExecutionResult } from 'model/backend/gitlab/types/executionHistory';
import { DigitalTwinData } from 'model/backend/state/digitalTwin.slice';
import { ExecutionStatus } from 'model/backend/interfaces/execution';
import { IExecutionHistoryStorage } from 'model/backend/interfaces/sharedInterfaces';
import { createDigitalTwinFromData } from 'model/backend/util/digitalTwinAdapter';
import * as logFetching from 'model/backend/gitlab/execution/logFetching';
import * as statusChecking from 'model/backend/gitlab/execution/statusChecking';
import { mockBackendInstance } from 'test/__mocks__/global_mocks';
import ExecutionStatusService from 'model/backend/state/ExecutionStatusService';

jest.mock('model/backend/util/digitalTwinAdapter');
jest.mock('model/backend/gitlab/execution/logFetching');
jest.mock('model/backend/gitlab/execution/statusChecking');

describe('ExecutionStatusService', () => {
  let mockExecutionStorage: IExecutionHistoryStorage;

  const mockExecution: DTExecutionResult = {
    dtName: 'test-dt',
    pipelineId: 100,
    status: ExecutionStatus.RUNNING,
  } as DTExecutionResult;

  const mockDigitalTwinsData: { [key: string]: DigitalTwinData } = {
    'test-dt': {
      gitlabProjectId: 123,
    } as DigitalTwinData,
  };

  beforeEach(() => {
    mockExecutionStorage = {
      update: jest.fn(),
    } as unknown as IExecutionHistoryStorage;

    (mockBackendInstance.getProjectId as jest.Mock).mockReturnValue(123);
    (mockBackendInstance.getPipelineStatus as jest.Mock).mockReset();

    (createDigitalTwinFromData as jest.Mock).mockResolvedValue({
      backend: mockBackendInstance,
    });
    (logFetching.fetchJobLogs as jest.Mock).mockResolvedValue([
      { jobName: 'test-job', log: 'test log' },
    ]);
    (
      statusChecking.mapGitlabStatusToExecutionStatus as jest.Mock
    ).mockImplementation((status) =>
      status === 'success' ? ExecutionStatus.SUCCESS : ExecutionStatus.FAILED,
    );
    (statusChecking.isFinishedStatus as jest.Mock).mockImplementation(
      (status) =>
        status === 'success' || status === 'failed' || status === 'canceled',
    );
    (statusChecking.isFailureStatus as jest.Mock).mockImplementation(
      (status: string) => status === 'failed' || status === 'skipped',
    );
    (statusChecking.isCanceledStatus as jest.Mock).mockImplementation(
      (status: string) => status === 'canceled' || status === 'cancelled',
    );
    (statusChecking.isSuccessStatus as jest.Mock).mockImplementation(
      (status: string) => status === 'success',
    );
  });

  describe('checkRunningExecutions', () => {
    it('should return empty array when no running executions', async () => {
      const result = await ExecutionStatusService.checkRunningExecutions(
        [],
        {},
        mockExecutionStorage,
      );

      expect(result).toEqual([]);
    });

    it('should update execution to FAILED when parent pipeline fails', async () => {
      (mockBackendInstance.getPipelineStatus as jest.Mock).mockResolvedValue(
        'failed',
      );

      const result = await ExecutionStatusService.checkRunningExecutions(
        [mockExecution],
        mockDigitalTwinsData,
        mockExecutionStorage,
      );

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(ExecutionStatus.FAILED);
      expect(mockExecutionStorage.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: ExecutionStatus.FAILED }),
      );
    });

    it('should not update when parent pipeline is running', async () => {
      (mockBackendInstance.getPipelineStatus as jest.Mock).mockResolvedValue(
        'running',
      );

      const result = await ExecutionStatusService.checkRunningExecutions(
        [mockExecution],
        mockDigitalTwinsData,
        mockExecutionStorage,
      );

      expect(result).toHaveLength(0);
      expect(mockExecutionStorage.update).not.toHaveBeenCalled();
    });

    it('should update execution when child pipeline succeeds', async () => {
      (mockBackendInstance.getPipelineStatus as jest.Mock)
        .mockResolvedValueOnce('success')
        .mockResolvedValueOnce('success');

      const result = await ExecutionStatusService.checkRunningExecutions(
        [mockExecution],
        mockDigitalTwinsData,
        mockExecutionStorage,
      );

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(ExecutionStatus.SUCCESS);
      expect(result[0].jobLogs).toBeDefined();
      expect(mockExecutionStorage.update).toHaveBeenCalled();
    });

    it('should update execution when child pipeline fails', async () => {
      (mockBackendInstance.getPipelineStatus as jest.Mock)
        .mockResolvedValueOnce('success')
        .mockResolvedValueOnce('failed');

      const result = await ExecutionStatusService.checkRunningExecutions(
        [mockExecution],
        mockDigitalTwinsData,
        mockExecutionStorage,
      );

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(ExecutionStatus.FAILED);
      expect(mockExecutionStorage.update).toHaveBeenCalled();
    });

    it('should skip execution when digital twin data is missing', async () => {
      const result = await ExecutionStatusService.checkRunningExecutions(
        [mockExecution],
        {},
        mockExecutionStorage,
      );

      expect(result).toHaveLength(0);
      expect(createDigitalTwinFromData).not.toHaveBeenCalled();
    });

    it('should skip execution when gitlabProjectId is missing', async () => {
      const dataWithoutProjectId = {
        'test-dt': {} as DigitalTwinData,
      };

      const result = await ExecutionStatusService.checkRunningExecutions(
        [mockExecution],
        dataWithoutProjectId,
        mockExecutionStorage,
      );

      expect(result).toHaveLength(0);
      expect(createDigitalTwinFromData).not.toHaveBeenCalled();
    });

    it('should handle child pipeline not existing yet', async () => {
      (mockBackendInstance.getPipelineStatus as jest.Mock)
        .mockResolvedValueOnce('success')
        .mockRejectedValueOnce(new Error('Pipeline not found'));

      const result = await ExecutionStatusService.checkRunningExecutions(
        [mockExecution],
        mockDigitalTwinsData,
        mockExecutionStorage,
      );

      expect(result).toHaveLength(0);
      expect(mockExecutionStorage.update).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully and continue processing', async () => {
      const executions: DTExecutionResult[] = [
        {
          dtName: 'failing-dt',
          pipelineId: 100,
          status: ExecutionStatus.RUNNING,
        } as DTExecutionResult,
        {
          dtName: 'test-dt',
          pipelineId: 200,
          status: ExecutionStatus.RUNNING,
        } as DTExecutionResult,
      ];

      const digitalTwinsData = {
        'failing-dt': { gitlabProjectId: 456 } as DigitalTwinData,
        'test-dt': { gitlabProjectId: 123 } as DigitalTwinData,
      };

      (mockBackendInstance.getPipelineStatus as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('failed');

      const result = await ExecutionStatusService.checkRunningExecutions(
        executions,
        digitalTwinsData,
        mockExecutionStorage,
      );

      expect(result).toHaveLength(1);
      expect(result[0].dtName).toBe('test-dt');
    });

    it('should check child pipeline with incremented id', async () => {
      (mockBackendInstance.getPipelineStatus as jest.Mock)
        .mockResolvedValueOnce('success')
        .mockResolvedValueOnce('success');

      await ExecutionStatusService.checkRunningExecutions(
        [mockExecution],
        mockDigitalTwinsData,
        mockExecutionStorage,
      );

      expect(mockBackendInstance.getPipelineStatus).toHaveBeenCalledWith(
        123,
        101,
      );
    });
  });
});
