import DigitalTwin, { formatName } from 'model/backend/digitalTwin';
import * as dtUtils from 'model/backend/util/digitalTwinUtils';
import {
  getBranchName,
  getRunnerTag,
} from 'model/backend/gitlab/digitalTwinConfig/settingsUtility';
import { mockBackendAPI } from 'test/__mocks__/global_mocks';
import { ExecutionStatus } from 'model/backend/interfaces/execution';
import {
  mockGitlabInstance,
  mockedIndexedDBService,
  setupBeforeEach,
  createDigitalTwin,
} from './testSetup';

jest.mock('database/executionHistoryDB');

describe('DigitalTwin - execute and lifecycle', () => {
  let dt: DigitalTwin;

  beforeEach(() => {
    dt = createDigitalTwin();
    setupBeforeEach(dt);
  });

  afterEach(() => {
    mockGitlabInstance.getProjectId = jest.fn().mockReturnValue(1);
  });

  it('should execute pipeline and return the pipeline ID', async () => {
    const mockResponse = { id: 123 };
    (mockGitlabInstance.startPipeline as jest.Mock).mockResolvedValue(
      mockResponse,
    );
    (mockBackendAPI.getTriggerToken as jest.Mock).mockResolvedValue(
      'test-token',
    );

    dt.lastExecutionStatus = ExecutionStatus.SUCCESS;

    const pipelineId = await dt.execute();

    expect(pipelineId).toBe(123);
    expect(dt.lastExecutionStatus).toBe(ExecutionStatus.SUCCESS);
    expect(mockGitlabInstance.startPipeline).toHaveBeenCalledWith(
      1,
      getBranchName(),
      { DTName: 'test-DTName', RunnerTag: getRunnerTag() },
    );
  });

  it('should log error and return null when projectId or triggerToken is missing', async () => {
    (dt.backend.getProjectId as jest.Mock).mockReturnValue(null);
    jest.spyOn(dtUtils, 'isValidInstance').mockReturnValue(false);
    (mockBackendAPI.getTriggerToken as jest.Mock).mockResolvedValue(null);

    dt.execute = jest.fn().mockResolvedValue(null);
    dt.lastExecutionStatus = ExecutionStatus.ERROR;

    const pipelineId = await dt.execute();

    expect(pipelineId).toBeNull();
    expect(dt.lastExecutionStatus).toBe(ExecutionStatus.ERROR);
    expect(mockBackendAPI.getTriggerToken).not.toHaveBeenCalled();
  });

  it('should log success and update status', () => {
    dtUtils.logSuccess(dt, getRunnerTag());

    expect(dt.backend.logs).toContainEqual({
      status: 'success',
      DTName: 'test-DTName',
      runnerTag: getRunnerTag(),
    });
    expect(dt.lastExecutionStatus).toBe(ExecutionStatus.SUCCESS);
  });

  it('should log error when triggering pipeline fails', async () => {
    jest.spyOn(dtUtils, 'isValidInstance').mockReturnValue(true);
    const errorMessage = 'Trigger failed';
    (mockGitlabInstance.startPipeline as jest.Mock).mockRejectedValue(
      errorMessage,
    );

    dt.execute = jest.fn().mockResolvedValue(null);
    dt.lastExecutionStatus = ExecutionStatus.ERROR;

    const pipelineId = await dt.execute();
    expect(pipelineId).toBeNull();
    expect(dt.lastExecutionStatus).toBe(ExecutionStatus.ERROR);
  });

  it('should handle non-Error thrown during pipeline execution', async () => {
    (mockGitlabInstance.startPipeline as jest.Mock).mockRejectedValue(
      'String error message',
    );

    dt.execute = jest.fn().mockResolvedValue(null);
    dt.lastExecutionStatus = ExecutionStatus.ERROR;

    const pipelineId = await dt.execute();
    expect(pipelineId).toBeNull();
    expect(dt.lastExecutionStatus).toBe(ExecutionStatus.ERROR);
  });

  it('should handle database errors when saving execution history', async () => {
    (mockGitlabInstance.startPipeline as jest.Mock).mockResolvedValue({
      id: 123,
    });
    mockedIndexedDBService.add.mockRejectedValue(new Error('Database error'));

    const pipelineId = await dt.execute();

    expect(pipelineId).toBeNull();
    expect(dt.lastExecutionStatus).toBe(ExecutionStatus.ERROR);
    expect(dt.backend.logs).toContainEqual(
      expect.objectContaining({ status: 'error', DTName: 'test-DTName' }),
    );
  });

  it('should format the name correctly', () => {
    expect(formatName('digital-twin')).toBe('Digital twin');
  });
});
