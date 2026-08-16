import DigitalTwin from 'model/backend/digitalTwin';
import { getBranchName } from 'model/backend/gitlab/digitalTwinConfig/settingsUtility';
import { mockBackendAPI } from 'test/__mocks__/global_mocks';
import { ExecutionStatus } from 'model/backend/interfaces/execution';
import {
  mockGitlabInstance,
  mockedIndexedDBService,
  files,
  setupBeforeEach,
  createDigitalTwin,
} from './testSetup';

describe('DigitalTwin - CRUD and execution history', () => {
  let dt: DigitalTwin;

  beforeEach(() => {
    dt = createDigitalTwin();
    setupBeforeEach(dt);
  });

  afterEach(() => {
    mockGitlabInstance.getProjectId = jest.fn().mockReturnValue(1);
  });

  it('should delete the digital twin', async () => {
    (mockBackendAPI.removeRepositoryFile as jest.Mock).mockResolvedValue({});

    await dt.delete();

    expect(mockBackendAPI.removeRepositoryFile).toHaveBeenCalled();
  });

  it('should delete the digital twin and return success message', async () => {
    (mockBackendAPI.removeRepositoryFile as jest.Mock).mockResolvedValue({});

    const result = await dt.delete();

    expect(result).toBe('test-DTName deleted successfully');
    expect(mockBackendAPI.removeRepositoryFile).toHaveBeenCalledWith(
      1,
      'digital_twins/test-DTName',
      getBranchName(),
      'Removing test-DTName digital twin',
    );
  });

  it('should return error message when deletion fails', async () => {
    (mockBackendAPI.removeRepositoryFile as jest.Mock).mockRejectedValue(
      new Error('Delete failed'),
    );

    const result = await dt.delete();

    expect(result).toBe('Error deleting test-DTName digital twin');
  });

  it('should create digital twin with files', async () => {
    (mockBackendAPI.commitMultipleActions as jest.Mock).mockResolvedValue({});
    (mockBackendAPI.getRepositoryFileContent as jest.Mock).mockResolvedValue({
      content: 'existing pipeline content',
    });
    const result = await dt.create(files, [], []);

    expect(result).toBe(
      'test-DTName digital twin files initialized successfully.',
    );
  });

  it('should return error message when creating digital twin fails', async () => {
    (mockBackendAPI.getRepositoryFileContent as jest.Mock).mockResolvedValue({
      content: 'existing pipeline content',
    });
    (mockBackendAPI.commitMultipleActions as jest.Mock).mockRejectedValue(
      new Error('Create failed'),
    );

    const result = await dt.create(files, [], []);

    expect(result).toBe(
      'Error initializing test-DTName digital twin files: Error: Create failed',
    );
  });

  it('should return error message when projectId is missing during creation', async () => {
    (dt.backend.getProjectId as jest.Mock).mockReturnValueOnce(null);

    const result = await dt.create(files, [], []);

    expect(result).toBe(
      'Error initializing test-DTName digital twin files: Error: Create failed',
    );
  });

  it('should get execution history for a digital twin', async () => {
    const mockExecutions = [
      {
        id: 'exec1',
        dtName: 'test-DTName',
        pipelineId: 123,
        timestamp: Date.now(),
        status: ExecutionStatus.COMPLETED,
        jobLogs: [],
      },
      {
        id: 'exec2',
        dtName: 'test-DTName',
        pipelineId: 124,
        timestamp: Date.now(),
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      },
    ];
    mockedIndexedDBService.getByDTName.mockResolvedValue(mockExecutions);

    const result = await dt.getExecutionHistory();

    expect(result).toEqual(mockExecutions);
    expect(mockedIndexedDBService.getByDTName).toHaveBeenCalledWith(
      'test-DTName',
    );
  });

  it('should handle database errors when fetching execution history', async () => {
    mockedIndexedDBService.getByDTName.mockRejectedValue(
      new Error('Database error'),
    );

    await expect(dt.getExecutionHistory()).rejects.toThrow('Database error');
  });

  it('should get execution history by ID', async () => {
    const mockExecution = {
      id: 'exec1',
      dtName: 'test-DTName',
      pipelineId: 123,
      timestamp: Date.now(),
      status: ExecutionStatus.COMPLETED,
      jobLogs: [],
    };
    mockedIndexedDBService.getById.mockResolvedValue(mockExecution);

    const result = await dt.getExecutionHistoryById('exec1');

    expect(result).toEqual(mockExecution);
    expect(mockedIndexedDBService.getById).toHaveBeenCalledWith('exec1');
  });

  it('should return undefined when execution history by ID is not found', async () => {
    mockedIndexedDBService.getById.mockResolvedValue(null);

    const result = await dt.getExecutionHistoryById('exec1');

    expect(result).toBeUndefined();
    expect(mockedIndexedDBService.getById).toHaveBeenCalledWith('exec1');
  });
});
