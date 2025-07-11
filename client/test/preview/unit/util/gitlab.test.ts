import GitlabInstance from 'model/backend/gitlab/instance';
import GitlabAPI from 'model/backend/gitlab/backend';
import { JobSummary } from 'model/backend/gitlab/UtilityInterfaces';
import {
  COMMON_LIBRARY_PROJECT_NAME,
  GROUP_NAME,
} from 'model/backend/gitlab/constants';
import { mockBackendAPI } from 'test/__mocks__/global_mocks';

jest.mock('@gitbeaker/rest');

describe('GitlabInstance', () => {
  let gitlab: GitlabInstance;
  const mockApi: GitlabAPI = mockBackendAPI;

  beforeEach(() => {
    jest.clearAllMocks();
    gitlab = new GitlabInstance('user1', mockApi);
  });

  it('should start pipeline', async () => {
    jest.spyOn(mockApi, 'startPipeline').mockResolvedValue({
      id: 1,
      status: 'running',
    });
    jest
      .spyOn(mockApi, 'getGroupByName')
      .mockResolvedValue({ id: 5, name: GROUP_NAME });
    jest.spyOn(mockApi, 'listGroupProjects').mockResolvedValue([
      { id: 2, name: 'user1' },
      { id: 5, name: 'common' },
    ]);
    jest.spyOn(mockApi, 'getTriggerToken').mockResolvedValue('test-token');

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
    jest
      .spyOn(mockApi, 'getGroupByName')
      .mockResolvedValue({ id: 5, name: GROUP_NAME });
    jest.spyOn(mockApi, 'listGroupProjects').mockResolvedValue([
      { id: 2, name: 'user1' },
      { id: 5, name: 'common' },
    ]);
    jest.spyOn(mockApi, 'getTriggerToken').mockResolvedValue('test-token');

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
    jest
      .spyOn(mockApi, 'getGroupByName')
      .mockResolvedValue({ id: 1, name: GROUP_NAME });
    jest.spyOn(mockApi, 'listGroupProjects').mockResolvedValue([
      { id: 1, name: 'user1' },
      { id: 2, name: 'common' },
    ]);
    jest.spyOn(mockApi, 'getTriggerToken').mockResolvedValue('test-token');

    await gitlab.init();

    expect(gitlab.getProjectId()).toBe(1);
    expect(gitlab.getCommonProjectId()).toBe(2);
    expect(mockApi.getGroupByName).toHaveBeenCalledWith(GROUP_NAME);
    expect(mockApi.listGroupProjects).toHaveBeenCalledWith(1);
    expect(mockApi.getTriggerToken).toHaveBeenCalledWith(1);
  });

  it('should throw error if project is not found', async () => {
    jest
      .spyOn(mockApi, 'getGroupByName')
      .mockResolvedValue({ id: 1, name: GROUP_NAME });
    jest.spyOn(mockApi, 'listGroupProjects').mockResolvedValue([]);

    await expect(gitlab.init()).rejects.toThrow(
      `Project ${gitlab.projectName} not found`,
    );

    expect(mockApi.getGroupByName).toHaveBeenCalledWith(GROUP_NAME);
    expect(mockApi.listGroupProjects).toHaveBeenCalledWith(1);
    expect(mockApi.getTriggerToken).not.toHaveBeenCalled();
  });

  it('should throw error if commonProject is not found', async () => {
    jest
      .spyOn(mockApi, 'getGroupByName')
      .mockResolvedValue({ id: 1, name: GROUP_NAME });
    jest
      .spyOn(mockApi, 'listGroupProjects')
      .mockResolvedValue([{ id: 1, name: 'user1' }]);

    await expect(gitlab.init()).rejects.toThrow(
      `Common project ${COMMON_LIBRARY_PROJECT_NAME} not found`,
    );

    expect(mockApi.getGroupByName).toHaveBeenCalledWith(GROUP_NAME);
    expect(mockApi.listGroupProjects).toHaveBeenCalledWith(1);
    expect(mockApi.getTriggerToken).not.toHaveBeenCalled();
  });

  it('should handle no trigger token found', async () => {
    jest
      .spyOn(mockApi, 'getGroupByName')
      .mockResolvedValue({ id: 1, name: GROUP_NAME });
    jest.spyOn(mockApi, 'listGroupProjects').mockResolvedValue([
      { id: 1, name: 'user1' },
      { id: 3, name: 'common' },
    ]);
    jest.spyOn(mockApi, 'getTriggerToken').mockResolvedValue(null);

    await expect(gitlab.init()).rejects.toThrow('Trigger token not found');

    expect(gitlab.getProjectId()).toBe(1);
    expect(gitlab.getCommonProjectId()).toBe(3);
    const token = await mockApi.getTriggerToken(1);
    expect(token).toBe(null);
    expect(mockApi.getGroupByName).toHaveBeenCalledWith(GROUP_NAME);
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
    jest
      .spyOn(mockApi, 'getGroupByName')
      .mockResolvedValue({ id: 5, name: GROUP_NAME });
    jest.spyOn(mockApi, 'listGroupProjects').mockResolvedValue([
      { id: 2, name: 'user1' },
      { id: 5, name: 'common' },
    ]);
    jest.spyOn(mockApi, 'getTriggerToken').mockResolvedValue('test-token');

    await gitlab.init();
    const result = gitlab.getTriggerToken();

    expect(result).toEqual('test-token');
  });
});
