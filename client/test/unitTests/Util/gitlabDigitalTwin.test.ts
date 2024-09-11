import { ProjectSchema, PipelineTriggerTokenSchema } from '@gitbeaker/rest';
import DigitalTwin from 'util/gitlabDigitalTwin';
import { GitlabInstance } from 'util/gitlab';

type LogEntry = { status: string; DTName: string; runnerTag: string };

const mockApi = {
  Groups: {
    show: jest.fn(),
    allProjects: jest.fn(),
  },
  PipelineTriggerTokens: {
    all: jest.fn(),
    trigger: jest.fn(),
  },
  Repositories: {
    allRepositoryTrees: jest.fn(),
  },
  RepositoryFiles: {
    show: jest.fn(),
    remove: jest.fn(),
  },
  Pipelines: {
    cancel: jest.fn(),
  },
};

const mockGitlabInstance = {
  api: mockApi as unknown as GitlabInstance['api'],
  executionLogs: jest.fn() as jest.Mock<LogEntry[]>,
  getProjectId: jest.fn(),
  getTriggerToken: jest.fn(),
  getDTSubfolders: jest.fn(),
  logs: [],
} as unknown as GitlabInstance;

describe('DigitalTwin', () => {
  let dt: DigitalTwin;

  beforeEach(() => {
    dt = new DigitalTwin('test-DTName', mockGitlabInstance);
  });

  it('should handle null project ID during pipeline execution', async () => {
    mockApi.Groups.show.mockResolvedValue({ id: 1, name: 'DTaaS' });
    mockApi.Groups.allProjects.mockResolvedValue([]);
    (mockGitlabInstance.getProjectId as jest.Mock).mockResolvedValue(null);

    const success = await dt.execute();

    expect(success).toBe(false);
    expect(dt.lastExecutionStatus).toBe('error');
    expect(mockApi.PipelineTriggerTokens.trigger).not.toHaveBeenCalled();
  });

  it('should handle null trigger token during pipeline execution', async () => {
    mockApi.Groups.show.mockResolvedValue({ id: 1, name: 'DTaaS' });
    mockApi.Groups.allProjects.mockResolvedValue([
      { id: 1, name: 'user1' } as ProjectSchema,
    ]);
    mockApi.PipelineTriggerTokens.all.mockResolvedValue([]);
    (mockGitlabInstance.getTriggerToken as jest.Mock).mockResolvedValue(null);

    const success = await dt.execute();

    expect(success).toBe(false);
    expect(dt.lastExecutionStatus).toBe('error');
    expect(mockApi.PipelineTriggerTokens.trigger).not.toHaveBeenCalled();
  });

  it('should execute pipeline successfully', async () => {
    mockApi.Groups.show.mockResolvedValue({ id: 1, name: 'DTaaS' });
    mockApi.Groups.allProjects.mockResolvedValue([
      { id: 1, name: 'user1' } as ProjectSchema,
    ]);
    mockApi.PipelineTriggerTokens.all.mockResolvedValue([
      { token: 'test-token' } as PipelineTriggerTokenSchema,
    ]);
    (mockGitlabInstance.getProjectId as jest.Mock).mockResolvedValue(1);
    (mockGitlabInstance.getTriggerToken as jest.Mock).mockResolvedValue(
      'test-token',
    );
    (mockApi.PipelineTriggerTokens.trigger as jest.Mock).mockResolvedValue(
      undefined,
    );

    const success = await dt.execute();

    expect(success).toBe(true);
    expect(dt.lastExecutionStatus).toBe('success');
    expect(mockApi.PipelineTriggerTokens.trigger).toHaveBeenCalledWith(
      1,
      'main',
      'test-token',
      { variables: { DTName: 'test-DTName', RunnerTag: 'test-runnerTag' } },
    );
  });

  it('should handle non-Error thrown during pipeline execution', async () => {
    mockApi.Groups.show.mockResolvedValue({ id: 1, name: 'DTaaS' });
    mockApi.Groups.allProjects.mockResolvedValue([
      { id: 1, name: 'user1' } as ProjectSchema,
    ]);
    mockApi.PipelineTriggerTokens.all.mockResolvedValue([
      { token: 'test-token' } as PipelineTriggerTokenSchema,
    ]);
    (mockGitlabInstance.getProjectId as jest.Mock).mockResolvedValue(1);
    (mockGitlabInstance.getTriggerToken as jest.Mock).mockResolvedValue(
      'test-token',
    );
    (mockApi.PipelineTriggerTokens.trigger as jest.Mock).mockRejectedValue(
      'String error message',
    );

    const success = await dt.execute();

    expect(success).toBe(false);
    expect(dt.lastExecutionStatus).toBe('error');
    expect(mockApi.PipelineTriggerTokens.trigger).toHaveBeenCalledWith(
      1,
      'main',
      'test-token',
      { variables: { DTName: 'test-DTName', RunnerTag: 'test-runnerTag' } },
    );
  });

  it('should handle Error thrown during pipeline execution', async () => {
    mockApi.Groups.show.mockResolvedValue({ id: 1, name: 'DTaaS' });
    mockApi.Groups.allProjects.mockResolvedValue([
      { id: 1, name: 'user1' } as ProjectSchema,
    ]);
    mockApi.PipelineTriggerTokens.all.mockResolvedValue([
      { token: 'test-token' } as PipelineTriggerTokenSchema,
    ]);

    mockApi.PipelineTriggerTokens.trigger.mockRejectedValue(
      new Error('Error instance message'),
    );

    const success = await dt.execute();

    expect(success).toBe(false);

    expect(dt.lastExecutionStatus).toBe('error');
  });

  it('should return execution logs', async () => {
    mockApi.Groups.show.mockResolvedValue({ id: 1, name: 'DTaaS' });
    mockApi.Groups.allProjects.mockResolvedValue([
      { id: 1, name: 'user1' } as ProjectSchema,
    ]);
    mockApi.PipelineTriggerTokens.all.mockResolvedValue([
      { token: 'test-token' } as PipelineTriggerTokenSchema,
    ]);
    mockApi.PipelineTriggerTokens.trigger.mockResolvedValue(undefined);

    await dt.execute();

    (mockGitlabInstance.executionLogs as jest.Mock).mockReturnValue([
      { status: 'success', DTName: 'test-DTName', runnerTag: 'test-runnerTag' },
    ]);

    const logs = dt.gitlabInstance.executionLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].status).toBe('success');
    expect(logs[0].DTName).toBe('test-DTName');
    expect(logs[0].runnerTag).toBe('test-runnerTag');
  });

  it('should return an error message if README.md does not exist', async () => {
    mockGitlabInstance.projectId = 1;
    const errorMessage = `There is no README.md file in the test-DTName GitLab folder`;
    mockApi.RepositoryFiles.show.mockRejectedValue(new Error('File not found'));

    const description = await dt.getFullDescription();

    expect(description).toBe(errorMessage);
    expect(mockApi.RepositoryFiles.show).toHaveBeenCalledWith(
      1,
      'digital_twins/test-DTName/README.md',
      'main',
    );
  });

  it('should delete the Digital Twin successfully', async () => {
    mockGitlabInstance.projectId = 1;
    mockApi.RepositoryFiles.remove.mockResolvedValue(undefined);

    const message = await dt.delete();

    expect(message).toBe('test-DTName deleted successfully');
    expect(mockApi.RepositoryFiles.remove).toHaveBeenCalledWith(
      1,
      'digital_twins/test-DTName',
      'main',
      'Removing test-DTName digital twin',
    );
  });

  it('should handle error during Digital Twin deletion', async () => {
    mockGitlabInstance.projectId = 1;
    mockApi.RepositoryFiles.remove.mockRejectedValue(
      new Error('Deletion error'),
    );

    const message = await dt.delete();

    expect(message).toBe('Error deleting test-DTName digital twin');
    expect(mockApi.RepositoryFiles.remove).toHaveBeenCalledWith(
      1,
      'digital_twins/test-DTName',
      'main',
      'Removing test-DTName digital twin',
    );
  });

  it('should return an error if no project id is provided during deletion', async () => {
    mockGitlabInstance.projectId = null;

    const message = await dt.delete();

    expect(message).toBe(
      'Error deleting test-DTName digital twin: no project id',
    );
    expect(mockApi.RepositoryFiles.remove).not.toHaveBeenCalled();
  });

  it('should stop a pipeline successfully', async () => {
    mockApi.Pipelines.cancel.mockResolvedValue(undefined);

    await dt.stop(1, 123);

    expect(mockApi.Pipelines.cancel).toHaveBeenCalledWith(1, 123);
    expect(mockGitlabInstance.logs).toContainEqual({
      status: 'canceled',
      DTName: 'test-DTName',
      runnerTag: 'linux',
    });
    expect(dt.lastExecutionStatus).toBe('canceled');
  });

  it('should handle error during pipeline stop', async () => {
    mockApi.Pipelines.cancel.mockRejectedValue(new Error('Stop error'));

    await dt.stop(1, 123);

    expect(mockApi.Pipelines.cancel).toHaveBeenCalledWith(1, 123);
    expect(mockGitlabInstance.logs).toContainEqual({
      status: 'error',
      error: new Error('Stop error'),
      DTName: 'test-DTName',
      runnerTag: 'linux',
    });
    expect(dt.lastExecutionStatus).toBe('error');
  });
});
