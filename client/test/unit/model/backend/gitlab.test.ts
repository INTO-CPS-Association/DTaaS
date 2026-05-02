import GitlabInstance from 'model/backend/gitlab/instance';
import GitlabAPI from 'model/backend/gitlab/backend';
import { JobSummary } from 'model/backend/interfaces/backendInterfaces';
import {
  getCommonLibraryProjectName,
  getGroupName,
  getDTDirectory,
  getBranchName,
} from 'model/backend/gitlab/digitalTwinConfig/settingsUtility';
import { mockBackendAPI } from 'test/__mocks__/global_mocks';

jest.mock('@gitbeaker/rest');

describe('GitlabInstance', () => {
  let gitlab: GitlabInstance;
  let mockApi: GitlabAPI;

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi = mockBackendAPI;
    gitlab = new GitlabInstance('user1', mockApi);
  });

  // Helper to set up common init mocks for tests that call gitlab.init()
  const setupGitlabInitMocks = (
    groupId = 5,
    projectId = 2,
    commonProjectId = 5,
    triggerToken: string | null = 'test-token',
  ) => {
    jest
      .spyOn(mockApi, 'getGroupByName')
      .mockResolvedValue({ id: groupId, name: getGroupName() });
    jest.spyOn(mockApi, 'listGroupProjects').mockResolvedValue([
      { id: projectId, name: 'user1' },
      { id: commonProjectId, name: 'common' },
    ]);
    jest.spyOn(mockApi, 'getTriggerToken').mockResolvedValue(triggerToken);
  };

  it('should start pipeline', async () => {
    jest.spyOn(mockApi, 'startPipeline').mockResolvedValue({
      id: 1,
      status: 'running',
    });
    setupGitlabInitMocks();

    await gitlab.init();
    const result = await gitlab.startPipeline(2, 'ref');

    expect(result).toEqual({ id: 1, status: 'running' });
    expect(mockApi.startPipeline).toHaveBeenCalledWith(
      2,
      'ref',
      undefined,
      'test-token',
    );
  });

  it('should start pipeline with variables', async () => {
    jest.spyOn(mockApi, 'startPipeline').mockResolvedValue({
      id: 1,
      status: 'running',
    });
    setupGitlabInitMocks();

    await gitlab.init();
    const result = await gitlab.startPipeline(2, 'ref', {
      testKey: 'testValue',
    });

    expect(result).toEqual({ id: 1, status: 'running' });
    expect(mockApi.startPipeline).toHaveBeenCalledWith(
      2,
      'ref',
      { testKey: 'testValue' },
      'test-token',
    );
  });

  it('should throw error if triggerToken is not provided when starting pipeline', async () => {
    await expect(gitlab.startPipeline(0, 'ref', {})).rejects.toThrow(
      'Trigger token is not set',
    );
  });

  it('should initialize with a project ID and trigger token', async () => {
    setupGitlabInitMocks(1, 1, 2);

    await gitlab.init();

    expect(gitlab.getProjectId()).toBe(1);
    expect(gitlab.getCommonProjectId()).toBe(2);
    expect(mockApi.getGroupByName).toHaveBeenCalledWith(getGroupName());
    expect(mockApi.listGroupProjects).toHaveBeenCalledWith(1);
    expect(mockApi.getTriggerToken).toHaveBeenCalledWith(1);
  });

  it('should throw error if project is not found', async () => {
    jest
      .spyOn(mockApi, 'getGroupByName')
      .mockResolvedValue({ id: 1, name: getGroupName() });
    jest.spyOn(mockApi, 'listGroupProjects').mockResolvedValue([]);

    await expect(gitlab.init()).rejects.toThrow(
      `Project ${gitlab.projectName} not found`,
    );

    expect(mockApi.getGroupByName).toHaveBeenCalledWith(getGroupName());
    expect(mockApi.listGroupProjects).toHaveBeenCalledWith(1);
    expect(mockApi.getTriggerToken).not.toHaveBeenCalled();
  });

  it('should throw error if commonProject is not found', async () => {
    jest
      .spyOn(mockApi, 'getGroupByName')
      .mockResolvedValue({ id: 1, name: getGroupName() });
    jest
      .spyOn(mockApi, 'listGroupProjects')
      .mockResolvedValue([{ id: 1, name: 'user1' }]);

    await expect(gitlab.init()).rejects.toThrow(
      `Common project ${getCommonLibraryProjectName()} not found`,
    );

    expect(mockApi.getGroupByName).toHaveBeenCalledWith(getGroupName());
    expect(mockApi.listGroupProjects).toHaveBeenCalledWith(1);
    expect(mockApi.getTriggerToken).not.toHaveBeenCalled();
  });

  it('should handle no trigger token found', async () => {
    setupGitlabInitMocks(1, 1, 3, null);

    await expect(gitlab.init()).rejects.toThrow('Trigger token not found');

    expect(gitlab.getProjectId()).toBe(1);
    expect(gitlab.getCommonProjectId()).toBe(3);
    const token = await mockApi.getTriggerToken(1);
    expect(token).toBe(null);
    expect(mockApi.getGroupByName).toHaveBeenCalledWith(getGroupName());
    expect(mockApi.listGroupProjects).toHaveBeenCalledWith(1);
    expect(mockApi.getTriggerToken).toHaveBeenCalledWith(1);
  });

  it('should return execution logs', () => {
    const mockLog = {
      status: 'canceled' as string,
      DTName: 'test-DTName-2',
      runnerTag: 'test-runnerTag-2',
      error: undefined,
    };

    gitlab.logs.push(mockLog);

    const logs = gitlab.getExecutionLogs();

    expect(logs).toHaveLength(1);
    expect(logs[0].status).toBe('canceled');
    expect(logs[0].DTName).toBe('test-DTName-2');
    expect(logs[0].runnerTag).toBe('test-runnerTag-2');
  });

  it('should fetch pipeline jobs successfully', async () => {
    const projectId = 3;
    const pipelineId = 2;
    const jobs: JobSummary[] = [
      { id: 1, name: 'job1', status: 'success' },
      { id: 2, name: 'job2', status: 'failed' },
    ];

    jest.spyOn(mockApi, 'listPipelineJobs').mockResolvedValue(jobs);

    const result = await gitlab.getPipelineJobs(projectId, pipelineId);

    expect(result).toEqual(jobs);
    expect(mockApi.listPipelineJobs).toHaveBeenCalledWith(
      projectId,
      pipelineId,
    );
  });

  it('should fetch job trace successfully', async () => {
    const projectId = 1;
    const jobId = 2;
    const log = 'Job log content';

    jest.spyOn(mockApi, 'getJobLog').mockResolvedValue(log);

    const result = await gitlab.getJobTrace(projectId, jobId);

    expect(result).toBe(log);
    expect(mockApi.getJobLog).toHaveBeenCalledWith(projectId, jobId);
  });

  it('should fetch pipeline status successfully', async () => {
    const projectId = 6;
    const pipelineId = 2;
    const status = 'success';

    jest.spyOn(mockApi, 'getPipelineStatus').mockResolvedValue(status);

    const result = await gitlab.getPipelineStatus(projectId, pipelineId);

    expect(result).toBe(status);
    expect(mockApi.getPipelineStatus).toHaveBeenCalledWith(
      projectId,
      pipelineId,
    );
  });

  it('should get triggerToken', async () => {
    jest.spyOn(mockApi, 'startPipeline').mockResolvedValue({
      id: 1,
      status: 'running',
    });
    setupGitlabInitMocks();

    await gitlab.init();
    const result = gitlab.getTriggerToken();

    expect(result).toEqual('test-token');
  });

  it('should fetch DT subfolders successfully', async () => {
    const projectId = gitlab.getCommonProjectId();
    const files = [
      { name: 'subfolder1', path: 'digital_twins/subfolder1', type: 'tree' },
      { name: 'subfolder2', path: 'digital_twins/subfolder2', type: 'tree' },
      { name: 'file1', path: 'digital_twins/file1', type: 'blob' },
    ];

    (mockApi.listRepositoryFiles as jest.Mock).mockResolvedValue(files);

    const subfolders = await mockApi.listRepositoryFiles(
      projectId,
      getDTDirectory(),
      getBranchName(),
      false,
    );

    expect(subfolders).toHaveLength(3);
    expect(subfolders).toEqual([
      { name: 'subfolder1', path: 'digital_twins/subfolder1', type: 'tree' },
      { name: 'subfolder2', path: 'digital_twins/subfolder2', type: 'tree' },
      { name: 'file1', path: 'digital_twins/file1', type: 'blob' },
    ]);

    expect(mockApi.listRepositoryFiles).toHaveBeenCalledWith(
      projectId,
      getDTDirectory(),
      getBranchName(),
      false,
    );
  });
});
