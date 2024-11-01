import GitlabInstance from 'preview/util/gitlab';
import DigitalTwin, { formatName } from 'preview/util/gitlabDigitalTwin';

const mockApi = {
  RepositoryFiles: {
    show: jest.fn(),
    remove: jest.fn(),
    edit: jest.fn(),
  },
  Repositories: {
    allRepositoryTrees: jest.fn(),
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

  it('should get description', async () => {
    (mockApi.RepositoryFiles.show as jest.Mock).mockResolvedValue({
      content: btoa('Test description content'),
    });

    await dt.getDescription();

    expect(dt.description).toBe('Test description content');
    expect(mockApi.RepositoryFiles.show).toHaveBeenCalledWith(
      1,
      'digital_twins/test-DTName/description.md',
      'main',
    );
  });

  it('should return empty description if no description file exists', async () => {
    (mockApi.RepositoryFiles.show as jest.Mock).mockRejectedValue(
      new Error('File not found'),
    );

    await dt.getDescription();

    expect(dt.description).toBe(
      'There is no description.md file in the test-DTName GitLab folder',
    );
  });

  it('should return full description with updated image URLs if projectId exists', async () => {
    const mockContent = btoa(
      'Test README content with an image ![alt text](image.png)',
    );

    (mockApi.RepositoryFiles.show as jest.Mock).mockResolvedValue({
      content: mockContent,
    });

    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn(() => 'testUser'),
        setItem: jest.fn(),
      },
      writable: true,
    });

    await dt.getFullDescription();

    expect(dt.fullDescription).toBe(
      'Test README content with an image ![alt text](https://example.com/AUTHORITY/dtaas/testUser/-/raw/main/digital_twins/test-DTName/image.png)',
    );

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
      'There is no README.md file in the test-DTName GitLab folder. Error: File not found',
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

  it('should stop the parent pipeline and update status', async () => {
    (mockApi.Pipelines.cancel as jest.Mock).mockResolvedValue({});

    await dt.stop(1, 'parentPipeline');

    expect(mockApi.Pipelines.cancel).toHaveBeenCalled();
    expect(dt.lastExecutionStatus).toBe('canceled');
  });

  it('should stop the child pipeline and update status', async () => {
    (mockApi.Pipelines.cancel as jest.Mock).mockResolvedValue({});

    await dt.stop(1, 'childPipeline');

    expect(mockApi.Pipelines.cancel).toHaveBeenCalled();
    expect(dt.lastExecutionStatus).toBe('canceled');
  });

  it('should handle stop error', async () => {
    (mockApi.Pipelines.cancel as jest.Mock).mockRejectedValue(
      new Error('Stop failed'),
    );

    await dt.stop(1, 'parentPipeline');

    expect(dt.lastExecutionStatus).toBe('error');
  });

  it('should format the name correctly', () => {
    const testCases = [{ input: 'digital-twin', expected: 'Digital twin' }];

    testCases.forEach(({ input, expected }) => {
      expect(formatName(input)).toBe(expected);
    });
  });

  it('should delete the digital twin', async () => {
    (mockApi.RepositoryFiles.remove as jest.Mock).mockResolvedValue({});

    await dt.delete();

    expect(mockApi.RepositoryFiles.remove).toHaveBeenCalled();
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
});
