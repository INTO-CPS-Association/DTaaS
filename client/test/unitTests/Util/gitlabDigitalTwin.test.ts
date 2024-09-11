import { GitlabInstance } from 'util/gitlab';
import DigitalTwin, { formatName } from 'util/gitlabDigitalTwin';

const mockApi = {
  RepositoryFiles: {
    show: jest.fn(),
    remove: jest.fn(),
  },
  PipelineTriggerTokens: {
    trigger: jest.fn(),
  },
  Pipelines: {
    cancel: jest.fn(),
  },
};

const mockGitlabInstance = {
  api: mockApi as unknown as GitlabInstance['api'],
  projectId: 1,
  triggerToken: 'test-token',
  logs: [] as { jobName: string; log: string }[],
  getProjectId: jest.fn(),
  getTriggerToken: jest.fn(),
} as unknown as GitlabInstance;

describe('DigitalTwin', () => {
  let dt: DigitalTwin;

  beforeEach(() => {
    mockGitlabInstance.projectId = 1;
    dt = new DigitalTwin('test-DTName', mockGitlabInstance);
  });

  it('should return full description if projectId exists', async () => {
    const mockContent = btoa('Test README content');
    (mockApi.RepositoryFiles.show as jest.Mock).mockResolvedValue({
      content: mockContent,
    });

    await dt.getFullDescription();

    expect(dt.fullDescription).toBe('Test README content');
    expect(mockApi.RepositoryFiles.show).toHaveBeenCalledWith(
      1,
      'digital_twins/test-DTName/README.md',
      'main',
    );
  });

  it('should return error message if no README.md file exists', async () => {
    (mockApi.RepositoryFiles.show as jest.Mock).mockRejectedValue(
      new Error('File not found'),
    );

    await dt.getFullDescription();

    expect(dt.fullDescription).toBe(
      'There is no README.md file in the test-DTName GitLab folder',
    );
  });

  it('should return error message when projectId is missing', async () => {
    dt.gitlabInstance.projectId = null;
    await dt.getFullDescription();
    expect(dt.fullDescription).toBe('Error fetching description, retry.');
  });

  it('should execute pipeline and return the pipeline ID', async () => {
    const mockResponse = { id: 123 };
    (mockApi.PipelineTriggerTokens.trigger as jest.Mock).mockResolvedValue(
      mockResponse,
    );
    (mockGitlabInstance.getProjectId as jest.Mock).mockResolvedValue(1);
    (mockGitlabInstance.getTriggerToken as jest.Mock).mockResolvedValue(
      'test-token',
    );

    const pipelineId = await dt.execute();

    expect(pipelineId).toBe(123);
    expect(dt.lastExecutionStatus).toBe('success');
    expect(mockApi.PipelineTriggerTokens.trigger).toHaveBeenCalledWith(
      1,
      'main',
      'test-token',
      { variables: { DTName: 'test-DTName', RunnerTag: 'linux' } },
    );
  });

  it('should log error and return null when projectId or triggerToken is missing', async () => {
    dt.gitlabInstance.projectId = null;
    dt.gitlabInstance.triggerToken = null;

    jest.spyOn(dt, 'isValidInstance').mockReturnValue(false);

    (mockApi.PipelineTriggerTokens.trigger as jest.Mock).mockReset();

    const pipelineId = await dt.execute();

    expect(pipelineId).toBeNull();
    expect(dt.lastExecutionStatus).toBe('error');
    expect(mockApi.PipelineTriggerTokens.trigger).not.toHaveBeenCalled();
  });

  it('should log success and update status', () => {
    dt.logSuccess();

    expect(dt.gitlabInstance.logs).toContainEqual({
      status: 'success',
      DTName: 'test-DTName',
      runnerTag: 'linux',
    });
    expect(dt.lastExecutionStatus).toBe('success');
  });

  it('should log error when triggering pipeline fails', async () => {
    jest.spyOn(dt, 'isValidInstance').mockReturnValue(true);
    const errorMessage = 'Trigger failed';
    (mockApi.PipelineTriggerTokens.trigger as jest.Mock).mockRejectedValue(
      errorMessage,
    );

    const pipelineId = await dt.execute();

    expect(pipelineId).toBeNull();
    expect(dt.lastExecutionStatus).toBe('error');
  });

  it('should handle non-Error thrown during pipeline execution', async () => {
    (mockApi.PipelineTriggerTokens.trigger as jest.Mock).mockRejectedValue(
      'String error message',
    );

    const pipelineId = await dt.execute();

    expect(pipelineId).toBeNull();
    expect(dt.lastExecutionStatus).toBe('error');
  });

  it('should stop the pipeline and update status', async () => {
    const pipelineId = 456;
    (mockApi.Pipelines.cancel as jest.Mock).mockResolvedValue({});

    await dt.stop(1, pipelineId);

    expect(mockApi.Pipelines.cancel).toHaveBeenCalledWith(1, pipelineId);
    expect(dt.lastExecutionStatus).toBe('canceled');
  });

  it('should handle stop error', async () => {
    (mockApi.Pipelines.cancel as jest.Mock).mockRejectedValue(
      new Error('Stop failed'),
    );

    await dt.stop(1, 456);

    expect(dt.lastExecutionStatus).toBe('error');
  });

  it('should delete the digital twin and return success message', async () => {
    (mockApi.RepositoryFiles.remove as jest.Mock).mockResolvedValue({});

    const result = await dt.delete();

    expect(result).toBe('test-DTName deleted successfully');
    expect(mockApi.RepositoryFiles.remove).toHaveBeenCalledWith(
      1,
      'digital_twins/test-DTName',
      'main',
      'Removing test-DTName digital twin',
    );
  });

  it('should return error message when deletion fails', async () => {
    (mockApi.RepositoryFiles.remove as jest.Mock).mockRejectedValue(
      new Error('Delete failed'),
    );

    const result = await dt.delete();

    expect(result).toBe('Error deleting test-DTName digital twin');
  });

  it('should return error message when projectId is missing during deletion', async () => {
    dt.gitlabInstance.projectId = null;

    const result = await dt.delete();

    expect(result).toBe(
      'Error deleting test-DTName digital twin: no project id',
    );
  });

  it('should format the name correctly', () => {
    const testCases = [{ input: 'digital-twin', expected: 'Digital twin' }];

    testCases.forEach(({ input, expected }) => {
      expect(formatName(input)).toBe(expected);
    });
  });
});
