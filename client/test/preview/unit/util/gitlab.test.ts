import { Gitlab } from '@gitbeaker/rest';
import GitlabInstance from 'model/backend/gitlab/gitlab';
import {
  BackendInterface,
  PipelineStatus,
} from 'model/backend/gitlab/interfaces';
import {
  COMMON_LIBRARY_PROJECT_NAME,
  GROUP_NAME,
} from 'model/backend/gitlab/constants';

jest.mock('@gitbeaker/rest');

describe('GitlabInstance', () => {
  let gitlab: BackendInterface;
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
    gitlab.api = mockApi as unknown as InstanceType<typeof Gitlab>; // USED
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

    expect(gitlab.getProjectId()).toBe(1);
    expect(gitlab.getCommonProjectId()).toBe(2);
    expect(gitlab.triggerToken).toBe('test-token'); // USED
    expect(mockApi.Groups.show).toHaveBeenCalledWith(GROUP_NAME);
    expect(mockApi.Groups.allProjects).toHaveBeenCalledWith(1);
    expect(mockApi.PipelineTriggerTokens.all).toHaveBeenCalledWith(1);
  });

  it('should throw error if project is not found', async () => {
    mockApi.Groups.show.mockResolvedValue({ id: 1, name: GROUP_NAME });
    mockApi.Groups.allProjects.mockResolvedValue([]); // No projects

    await expect(gitlab.init()).rejects.toThrow(
      `Project ${gitlab.projectName} not found`,
    );

    expect(gitlab.triggerToken).toBeNull(); // USED
    expect(mockApi.Groups.show).toHaveBeenCalledWith(GROUP_NAME);
    expect(mockApi.Groups.allProjects).toHaveBeenCalledWith(1);
    expect(mockApi.PipelineTriggerTokens.all).not.toHaveBeenCalled();
  });

  it('should throw error if commonProject isnot found', async () => {
    mockApi.Groups.show.mockResolvedValue({ id: 1, name: GROUP_NAME });
    mockApi.Groups.allProjects.mockResolvedValue([
      { id: 1, name: 'user1' }, // No common project
    ]);

    await expect(gitlab.init()).rejects.toThrow(
      `Common project ${COMMON_LIBRARY_PROJECT_NAME} not found`,
    );

    expect(gitlab.triggerToken).toBeNull(); // USED
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

    expect(gitlab.getProjectId()).toBe(1);
    expect(gitlab.getCommonProjectId()).toBe(3);
    expect(gitlab.triggerToken).toBeNull(); // USED
    expect(mockApi.Groups.show).toHaveBeenCalledWith(GROUP_NAME);
    expect(mockApi.Groups.allProjects).toHaveBeenCalledWith(1);
    expect(mockApi.PipelineTriggerTokens.all).toHaveBeenCalledWith(1);
  });

  it('should return execution logs', () => {
    const mockLog = {
      status: 'canceled' as PipelineStatus,
      DTName: 'test-DTName-2',
      runnerTag: 'test-runnerTag-2',
      error: undefined,
    };

    gitlab.logs.push(mockLog); // USED

    const logs = gitlab.executionLogs(); // USED

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

    const result = await gitlab.getPipelineJobs(projectId, pipelineId); // USED

    expect(result).toEqual(jobs);
    expect(mockApi.Jobs.all).toHaveBeenCalledWith(projectId, { pipelineId }); // USED
  });

  it('should fetch job trace successfully', async () => {
    const projectId = 1;
    const jobId = 2;
    const log = 'Job log content';

    mockApi.Jobs.showLog.mockResolvedValue(log);

    const result = await gitlab.getJobTrace(projectId, jobId); // USED

    expect(result).toBe(log);
    expect(mockApi.Jobs.showLog).toHaveBeenCalledWith(projectId, jobId);
  });

  it('should fetch pipeline status successfully', async () => {
    const projectId = 6;
    const pipelineId = 2;
    const status = 'success';

    mockApi.Pipelines.show.mockResolvedValue({ status });

    const result = await gitlab.getPipelineStatus(projectId, pipelineId); // USED

    expect(result).toBe(status);
    expect(mockApi.Pipelines.show).toHaveBeenCalledWith(projectId, pipelineId);
  });
});
