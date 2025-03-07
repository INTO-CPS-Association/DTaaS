import { JobSchema } from '@gitbeaker/rest';
import {
  cleanLogContent,
  fetchJobLogs,
  startPipeline,
  updatePipelineStateOnCompletion,
} from 'preview/route/digitaltwins/execute/pipelineUtils';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';

describe('PipelineUtils', () => {
  const digitalTwin = mockDigitalTwin;
  const dispatch = jest.fn();
  const setLogButtonDisabled = jest.fn();
  const setButtonText = jest.fn();
  const { gitlabInstance } = digitalTwin;
  const pipelineId = 1;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('starts pipeline and handles success', async () => {
    const execute = jest.spyOn(digitalTwin, 'execute');
    digitalTwin.lastExecutionStatus = 'success';

    await startPipeline(digitalTwin, dispatch, setLogButtonDisabled);

    expect(execute).toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'snackbar/showSnackbar',
        payload: {
          message: expect.stringContaining('Execution started successfully'),
          severity: 'success',
        },
      }),
    );
    expect(setLogButtonDisabled).toHaveBeenCalledWith(true);

    execute.mockRestore();
  });

  it('starts pipeline and handles failed', async () => {
    const execute = jest.spyOn(digitalTwin, 'execute');
    digitalTwin.lastExecutionStatus = 'failed';

    await startPipeline(digitalTwin, dispatch, setLogButtonDisabled);

    expect(execute).toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'snackbar/showSnackbar',
        payload: {
          message: expect.stringContaining('Execution failed'),
          severity: 'error',
        },
      }),
    );
    expect(setLogButtonDisabled).toHaveBeenCalledWith(true);

    execute.mockRestore();
  });

  it('updates pipeline state on completion', async () => {
    await updatePipelineStateOnCompletion(
      digitalTwin,
      [{ jobName: 'job1', log: 'log1' }],
      setButtonText,
      setLogButtonDisabled,
      dispatch,
    );

    expect(dispatch).toHaveBeenCalledTimes(3);
    expect(setButtonText).toHaveBeenCalledWith('Start');
    expect(setLogButtonDisabled).toHaveBeenCalledWith(false);
  });

  it('fetches job logs', async () => {
    const mockJob = {
      id: 1,
      name: 'job1',
      status: 'success',
      stage: 'build',
    } as JobSchema;

    // Use safe mocking pattern with explicit types
    const mockGetPipelineJobs = jest
      .spyOn(gitlabInstance, 'getPipelineJobs')
      .mockImplementation(() => Promise.resolve([mockJob]));

    const mockGetJobTrace = jest
      .spyOn(gitlabInstance, 'getJobTrace')
      .mockImplementation(() => Promise.resolve('log1'));

    const result = await fetchJobLogs(gitlabInstance, pipelineId);

    expect(mockGetPipelineJobs).toHaveBeenCalledWith(
      gitlabInstance.projectId,
      pipelineId,
    );
    expect(mockGetJobTrace).toHaveBeenCalledWith(gitlabInstance.projectId, 1);
    expect(result).toEqual([{ jobName: 'job1', log: 'log1' }]);

    mockGetPipelineJobs.mockRestore();
    mockGetJobTrace.mockRestore();
  });

  // Tests for cleanLogContent function
  describe('cleanLogContent', () => {
    it('should remove ANSI escape sequences', () => {
      const input = '\u001b[32mSuccess\u001b[0m';
      const expected = 'Success';
      expect(cleanLogContent(input)).toBe(expected);
    });

    it('should remove GitLab section markers', () => {
      const input = 'section_start:1234:build_step\nBuilding project\nsection_end:1234:build_step';
      const expected = '\nBuilding project\n';
      expect(cleanLogContent(input)).toBe(expected);
    });

    it('should handle empty or invalid input', () => {
      expect(cleanLogContent('')).toBe('');
      expect(cleanLogContent(null)).toBe('');
      expect(cleanLogContent(undefined)).toBe('');
    });

    it('should preserve regular log content', () => {
      const input = 'Running with gitlab-runner 17.9.0\nCloning repository\nBuilding project';
      expect(cleanLogContent(input)).toBe(input);
    });

    it('should handle logs with complex ANSI color codes', () => {
      const input = '\u001b[38;5;196mError\u001b[0m: \u001b[38;5;33mBuild failed\u001b[0m';
      const expected = 'Error: Build failed';
      expect(cleanLogContent(input)).toBe(expected);
    });
  });
});