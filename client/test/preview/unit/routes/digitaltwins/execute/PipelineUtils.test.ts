import {
  cleanLogContent,
  fetchJobLogs,
  startPipeline,
  updatePipelineStateOnCompletion
} from 'preview/route/digitaltwins/execute/pipelineUtils';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';
import { JobSchema } from '@gitbeaker/rest';
import GitlabInstance from 'preview/util/gitlab';

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

  describe('fetchJobLogs', () => {
    it('fetches job logs', async () => {
      const mockJob: Partial<JobSchema> = { id: 1, name: 'job1' };
  
      const getPipelineJobsMock = jest.spyOn(gitlabInstance, 'getPipelineJobs');
      getPipelineJobsMock.mockResolvedValue([mockJob as JobSchema]);
  
      const getJobTraceMock = jest.spyOn(gitlabInstance, 'getJobTrace');
      getJobTraceMock.mockResolvedValue('log1');
  
      const result = await fetchJobLogs(gitlabInstance, pipelineId);
  
      expect(getPipelineJobsMock).toHaveBeenCalledWith(
        gitlabInstance.projectId,
        pipelineId,
      );
      expect(getJobTraceMock).toHaveBeenCalledWith(gitlabInstance.projectId, 1);
      expect(result).toEqual([{ jobName: 'job1', log: 'log1' }]);
    });
  
    it('returns empty array if projectId is falsy', async () => {
      // Create a proper mock of GitlabInstance with projectId set to undefined
      const mockGitlabInstance = {
        ...gitlabInstance,
        projectId: undefined,
        getPipelineJobs: jest.fn(),
        getJobTrace: jest.fn()
      } as unknown as GitlabInstance;
      
      const result = await fetchJobLogs(mockGitlabInstance, pipelineId);
      expect(result).toEqual([]);
    });
    
    it('handles error when fetching job trace', async () => {
      const mockJob: Partial<JobSchema> = { id: 1, name: 'job1' };
      
      const getPipelineJobsMock = jest.spyOn(gitlabInstance, 'getPipelineJobs');
      getPipelineJobsMock.mockResolvedValue([mockJob as JobSchema]);
      
      const getJobTraceMock = jest.spyOn(gitlabInstance, 'getJobTrace');
      getJobTraceMock.mockRejectedValue(new Error('Error fetching trace'));
      
      const result = await fetchJobLogs(gitlabInstance, pipelineId);
      
      expect(result).toEqual([{ jobName: 'job1', log: 'Error fetching log content' }]);
    });
    
    it('handles job with missing name', async () => {
      const mockJob: Partial<JobSchema> = { id: 1 };
      
      const getPipelineJobsMock = jest.spyOn(gitlabInstance, 'getPipelineJobs');
      getPipelineJobsMock.mockResolvedValue([mockJob as JobSchema]);
      
      const getJobTraceMock = jest.spyOn(gitlabInstance, 'getJobTrace');
      getJobTraceMock.mockResolvedValue('log content');
      
      const result = await fetchJobLogs(gitlabInstance, pipelineId);
      
      expect(result).toEqual([{ jobName: 'Unknown', log: 'log content' }]);
    });
    
    it('handles non-string log content', async () => {
      const mockJob: Partial<JobSchema> = { id: 1, name: 'job1' };
      
      const getPipelineJobsMock = jest.spyOn(gitlabInstance, 'getPipelineJobs');
      getPipelineJobsMock.mockResolvedValue([mockJob as JobSchema]);
      
      const getJobTraceMock = jest.spyOn(gitlabInstance, 'getJobTrace');
      getJobTraceMock.mockResolvedValue('');
      
      const result = await fetchJobLogs(gitlabInstance, pipelineId);
      
      expect(result).toEqual([{ jobName: 'job1', log: '' }]);
    });
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
      const expected = 'Building project';
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
    
    it('should handle section markers embedded in text', () => {
      const input = 'Starting jobsection_end:1234:job\nNext line';
      const expected = 'Starting job\nNext line';
      expect(cleanLogContent(input)).toBe(expected);
    });
    
    it('handles pure section markers as empty lines', () => {
      const input = 'section_start:1234:section_name\nsection_end:1234:section_name';
      expect(cleanLogContent(input)).toBe('');
    });
    
    it('handles multiple ANSI sequences in complex logs', () => {
      const input = '\u001b[32mRunning\u001b[0m \u001b[33mtest\u001b[0m\n\u001b[31mError\u001b[0m';
      const expected = 'Running test\nError';
      expect(cleanLogContent(input)).toBe(expected);
    });
    
    it('filters out empty lines after cleaning', () => {
      const input = 'Line1\n\nLine2\n   \nLine3';
      const expected = 'Line1\nLine2\nLine3';
      expect(cleanLogContent(input)).toBe(expected);
    });
    
    it('properly trims whitespace from each line', () => {
      const input = '   Line with spaces   \n\t\tTabbed line\t\t';
      const expected = 'Line with spaces\nTabbed line';
      expect(cleanLogContent(input)).toBe(expected);
    });
  });
});