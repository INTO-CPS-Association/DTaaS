import { Gitlab } from '@gitbeaker/rest';
import GitlabInstance from 'util/gitlab';

jest.mock('@gitbeaker/rest');

describe('GitlabInstance', () => {
  let gitlab: GitlabInstance;
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
  };

  beforeEach(() => {
    window.sessionStorage.clear();
    jest.clearAllMocks();

    gitlab = new GitlabInstance(
      'user1',
      'https://gitlab.example.com',
      'test_token',
    );
    gitlab.api = mockApi as unknown as InstanceType<typeof Gitlab>;
  });

  it('should initialize the Gitlab API with the correct parameters', () => {
    expect(Gitlab).toHaveBeenCalledWith({
      host: 'https://gitlab.example.com',
      oauthToken: 'test_token',
    });
  });

  it('should fetch project ID successfully', async () => {
    mockApi.Groups.show.mockResolvedValue({ id: 1, name: 'DTaaS' });
    mockApi.Groups.allProjects.mockResolvedValue([{ id: 1, name: 'user1' }]);

    const projectId = await gitlab.getProjectId();

    expect(projectId).toBe(1);
    expect(mockApi.Groups.show).toHaveBeenCalledWith('DTaaS');
    expect(mockApi.Groups.allProjects).toHaveBeenCalledWith(1);
  });

  it('should handle project ID not found', async () => {
    mockApi.Groups.show.mockResolvedValue({ id: 1, name: 'DTaaS' });
    mockApi.Groups.allProjects.mockResolvedValue([]);

    const projectId = await gitlab.getProjectId();

    expect(projectId).toBeNull();
  });

  it('should fetch trigger token successfully', async () => {
    mockApi.PipelineTriggerTokens.all.mockResolvedValue([
      { token: 'test-token' },
    ]);

    const token = await gitlab.getTriggerToken(1);

    expect(token).toBe('test-token');
    expect(mockApi.PipelineTriggerTokens.all).toHaveBeenCalledWith(1);
  });

  it('should handle no trigger tokens found', async () => {
    mockApi.PipelineTriggerTokens.all.mockResolvedValue([]);

    const token = await gitlab.getTriggerToken(1);

    expect(token).toBeNull();
    expect(mockApi.PipelineTriggerTokens.all).toHaveBeenCalledWith(1);
  });

  it('should handle undefined trigger tokens', async () => {
    mockApi.PipelineTriggerTokens.all.mockResolvedValue(undefined);

    const token = await gitlab.getTriggerToken(1);

    expect(token).toBeNull();
  });

  it('should fetch DT subfolders successfully', async () => {
    mockApi.Repositories.allRepositoryTrees.mockResolvedValue([
      { name: 'subfolder1', path: 'digital_twins/subfolder1', type: 'tree' },
      { name: 'subfolder2', path: 'digital_twins/subfolder2', type: 'tree' },
      { name: 'file1', path: 'digital_twins/file1', type: 'blob' },
    ]);

    const subfolders = await gitlab.getDTSubfolders(1);

    expect(subfolders).toHaveLength(2);
    expect(subfolders).toEqual([
      { name: 'subfolder1', path: 'digital_twins/subfolder1' },
      { name: 'subfolder2', path: 'digital_twins/subfolder2' },
    ]);
    expect(mockApi.Repositories.allRepositoryTrees).toHaveBeenCalledWith(1, {
      path: 'digital_twins',
      recursive: false,
    });
  });

  it('should return execution logs', () => {
    const mockLog = {
      status: 'success',
      DTName: 'test-DTName',
      runnerTag: 'test-runnerTag',
      error: undefined,
    };

    gitlab.logs.push(mockLog);

    const logs = gitlab.executionLogs();

    expect(logs).toHaveLength(1);
    expect(logs[0].status).toBe('success');
    expect(logs[0].DTName).toBe('test-DTName');
    expect(logs[0].runnerTag).toBe('test-runnerTag');
  });
});