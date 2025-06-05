import GitlabInstance from 'model/backend/gitlab/gitlab';
import GitlabAPI from 'model/backend/gitlab/gitlabAPI';
import {
  BackendInterface,
  JobSummary,
  PipelineStatus,
} from 'model/backend/gitlab/interfaces';
import {
  COMMON_LIBRARY_PROJECT_NAME,
  GROUP_NAME,
} from 'model/backend/gitlab/constants';
import { mockBackendAPI } from 'test/preview/__mocks__/global_mocks';

jest.mock('@gitbeaker/rest');

describe('GitlabInstance', () => {
  let gitlab: BackendInterface;
  const mockApi: GitlabAPI = mockBackendAPI;

  beforeEach(() => {
    jest.clearAllMocks();

    gitlab = new GitlabInstance('user1', mockApi);
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
    const token = await mockApi.getTriggerToken(1);
    expect(token).toBe('test-token'); // USED
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
    expect(await mockApi.getTriggerToken).not.toHaveBeenCalled();
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

    await gitlab.init();

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
    const jobs: JobSummary[] = [
      { id: 1, name: 'job1', status: 'success' },
      { id: 2, name: 'job2', status: 'failed' },
    ];

    jest.spyOn(mockApi, 'listPipelineJobs').mockResolvedValue(jobs); // USED
    // mockApi.Jobs.all.mockResolvedValue(jobs);

    const result = await gitlab.getPipelineJobs(projectId, pipelineId); // USED

    expect(result).toEqual(jobs);
    expect(mockApi.listPipelineJobs).toHaveBeenCalledWith(
      projectId,
      pipelineId,
    ); // USED
  });

  it('should fetch job trace successfully', async () => {
    const projectId = 1;
    const jobId = 2;
    const log = 'Job log content';

    jest.spyOn(mockApi, 'getJobLog').mockResolvedValue(log);
    // mockApi.Jobs.showLog.mockResolvedValue(log);

    const result = await gitlab.getJobTrace(projectId, jobId); // USED

    expect(result).toBe(log);
    expect(mockApi.getJobLog).toHaveBeenCalledWith(projectId, jobId);
  });

  it('should fetch pipeline status successfully', async () => {
    const projectId = 6;
    const pipelineId = 2;
    const status = 'success';

    jest.spyOn(mockApi, 'getPipelineStatus').mockResolvedValue(status); // USED
    // mockApi.Pipelines.show.mockResolvedValue({ status });

    const result = await gitlab.getPipelineStatus(projectId, pipelineId); // USED

    expect(result).toBe(status);
    expect(mockApi.getPipelineStatus).toHaveBeenCalledWith(
      projectId,
      pipelineId,
    );
  });
});
