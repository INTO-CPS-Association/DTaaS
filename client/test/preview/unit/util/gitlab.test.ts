import { Gitlab } from '@gitbeaker/rest';
import GitlabInstance from 'preview/util/gitlab';
import {
  GROUP_NAME,
  DT_DIRECTORY,
  AssetTypes,
} from 'model/backend/gitlab/constants';
import { PipelineStatus } from 'model/backend/gitlab/gitlab';

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
    },
    RepositoryFiles: {
      show: jest.fn(),
    },
    Repositories: {
      allRepositoryTrees: jest.fn(),
    },
    Jobs: {
      all: jest.fn(),
      showLog: jest.fn(),
    },
    Pipelines: {
      show: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    gitlab = new GitlabInstance(
      'user1',
      'https://gitlab.example.com',
      'test_token',
    );
    gitlab.api = mockApi as unknown as InstanceType<typeof Gitlab>;
  });

  it('should initialize with a project ID and trigger token', async () => {
    mockApi.Groups.show.mockResolvedValue({ id: 1, name: GROUP_NAME });
    mockApi.Groups.allProjects.mockResolvedValue([
      { id: 1, name: 'user1' },
      { id: 2, name: 'common' },
    ]);
    mockApi.PipelineTriggerTokens.all.mockResolvedValue([
      { token: 'test-token' },
    ]);

    await gitlab.init();

    expect(gitlab.projectId).toBe(1);
    expect(gitlab.commonProjectId).toBe(2);
    expect(gitlab.triggerToken).toBe('test-token');
    expect(mockApi.Groups.show).toHaveBeenCalledWith(GROUP_NAME);
    expect(mockApi.Groups.allProjects).toHaveBeenCalledWith(1);
    expect(mockApi.PipelineTriggerTokens.all).toHaveBeenCalledWith(1);
  });

  it('should handle no project ID found', async () => {
    mockApi.Groups.show.mockResolvedValue({ id: 1, name: GROUP_NAME });
    mockApi.Groups.allProjects.mockResolvedValue([]);

    await gitlab.init();

    expect(gitlab.projectId).toBeNull();
    expect(gitlab.projectId).toBeNull();
    expect(gitlab.triggerToken).toBeNull();
    expect(mockApi.Groups.show).toHaveBeenCalledWith(GROUP_NAME);
    expect(mockApi.Groups.allProjects).toHaveBeenCalledWith(1);
    expect(mockApi.PipelineTriggerTokens.all).not.toHaveBeenCalled();
  });

  it('should handle no trigger token found', async () => {
    mockApi.Groups.show.mockResolvedValue({ id: 1, name: GROUP_NAME });
    mockApi.Groups.allProjects.mockResolvedValue([
      { id: 1, name: 'user1' },
      { id: 3, name: 'common' },
    ]);
    mockApi.PipelineTriggerTokens.all.mockResolvedValue([]);

    await gitlab.init();

    expect(gitlab.projectId).toBe(1);
    expect(gitlab.commonProjectId).toBe(3);
    expect(gitlab.triggerToken).toBeNull();
    expect(mockApi.Groups.show).toHaveBeenCalledWith(GROUP_NAME);
    expect(mockApi.Groups.allProjects).toHaveBeenCalledWith(1);
    expect(mockApi.PipelineTriggerTokens.all).toHaveBeenCalledWith(1);
  });

  it('should fetch DT subfolders successfully', async () => {
    const projectId = 5;
    const files = [
      { name: 'subfolder1', path: 'digital_twins/subfolder1', type: 'tree' },
      { name: 'subfolder2', path: 'digital_twins/subfolder2', type: 'tree' },
      { name: 'file1', path: 'digital_twins/file1', type: 'blob' },
    ];

    mockApi.Repositories.allRepositoryTrees.mockResolvedValue(files);

    const subfolders = await gitlab.getDTSubfolders(projectId);

    expect(subfolders).toHaveLength(2);

    expect(mockApi.Repositories.allRepositoryTrees).toHaveBeenCalledWith(
      projectId,
      {
        path: DT_DIRECTORY,
        recursive: false,
      },
    );
  });

  it('should fetch private library subfolders succesfully', async () => {
    const projectId = 3;
    const files = [{ name: 'file', path: 'models/file', type: 'blob' }];

    mockApi.Repositories.allRepositoryTrees.mockResolvedValue(files);

    const type = 'Models' as keyof typeof AssetTypes;
    const subfolders = await gitlab.getLibrarySubfolders(projectId, type, true);

    expect(subfolders).toHaveLength(0);

    expect(mockApi.Repositories.allRepositoryTrees).toHaveBeenCalledWith(
      projectId,
      {
        path: AssetTypes[type as keyof typeof AssetTypes],
        recursive: false,
      },
    );
  });

  it('should fetch common library subfolders succesfully', async () => {
    gitlab.commonProjectId = 6;
    const projectId = 5;
    const files = [
      { name: 'subfolder1', path: 'tools/subfolder1', type: 'tree' },
    ];

    mockApi.Repositories.allRepositoryTrees.mockResolvedValue(files);

    const type = 'Tools' as keyof typeof AssetTypes;
    const subfolders = await gitlab.getLibrarySubfolders(
      projectId,
      type,
      false,
    );

    expect(subfolders).toHaveLength(1);

    expect(mockApi.Repositories.allRepositoryTrees).toHaveBeenCalledWith(
      gitlab.commonProjectId,
      {
        path: AssetTypes[type as keyof typeof AssetTypes],
        recursive: false,
      },
    );
  });

  it('should throw error when fetching common library subfolders without common project id', async () => {
    gitlab.commonProjectId = null;
    await expect(
      gitlab.getLibrarySubfolders(1, 'Data' as keyof typeof AssetTypes, false),
    ).rejects.toThrow('Project ID not found');
  });

  it('should throw error when fetching invalid library asset type', async () => {
    await expect(
      gitlab.getLibrarySubfolders(2, 'Foo' as keyof typeof AssetTypes, false),
    ).rejects.toThrow('Invalid asset type: Foo');
  });

  it('should return execution logs', () => {
    const mockLog = {
      status: 'success' as PipelineStatus,
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

  it('should return execution logs from getLogs', () => {
    const mockLog = {
      status: 'canceled' as PipelineStatus,
      DTName: 'test-DTName-2',
      runnerTag: 'test-runnerTag-2',
      error: undefined,
    };

    gitlab.logs.push(mockLog);

    const logs = gitlab.getLogs();

    expect(logs).toHaveLength(1);
    expect(logs[0].status).toBe('canceled');
    expect(logs[0].DTName).toBe('test-DTName-2');
    expect(logs[0].runnerTag).toBe('test-runnerTag-2');
  });

  it('should fetch pipeline jobs successfully', async () => {
    const projectId = 3;
    const pipelineId = 2;
    const jobs = [
      { id: 1, name: 'job1' },
      { id: 2, name: 'job2' },
    ];

    mockApi.Jobs.all.mockResolvedValue(jobs);

    const result = await gitlab.getPipelineJobs(projectId, pipelineId);

    expect(result).toEqual(jobs);
    expect(mockApi.Jobs.all).toHaveBeenCalledWith(projectId, { pipelineId });
  });

  it('should fetch job trace successfully', async () => {
    const projectId = 1;
    const jobId = 2;
    const log = 'Job log content';

    mockApi.Jobs.showLog.mockResolvedValue(log);

    const result = await gitlab.getJobTrace(projectId, jobId);

    expect(result).toBe(log);
    expect(mockApi.Jobs.showLog).toHaveBeenCalledWith(projectId, jobId);
  });

  it('should fetch pipeline status successfully', async () => {
    const projectId = 6;
    const pipelineId = 2;
    const status = 'success';

    mockApi.Pipelines.show.mockResolvedValue({ status });

    const result = await gitlab.getPipelineStatus(projectId, pipelineId);

    expect(result).toBe(status);
    expect(mockApi.Pipelines.show).toHaveBeenCalledWith(projectId, pipelineId);
  });
});
