import {
    handleButtonClick,
    handleStop,
    checkFirstPipelineStatus,
    fetchJobLogs,
    handlePipelineCompletion,
    retryPipelineCheck,
  } from 'route/digitaltwins/ExecutionFunctions';
  import DigitalTwin from 'util/gitlabDigitalTwin';
  import { GitlabInstance } from 'util/gitlab';
  
  jest.mock('util/gitlabDigitalTwin');
  jest.mock('util/gitlab', () => ({
    GitlabInstance: jest.fn().mockImplementation(() => ({
      getPipelineStatus: jest.fn(),
      getPipelineJobs: jest.fn(),
      getJobTrace: jest.fn(),
      stop: jest.fn(),
    })),
  }));
  
  jest.mock('strip-ansi');
  
  describe('ExecutionFunctions', () => {
    let mockSetButtonText: jest.Mock;
    let mockSetJobLogs: jest.Mock;
    let mockSetPipelineCompleted: jest.Mock;
    let mockSetPipelineLoading: jest.Mock;
    let mockSetExecutionStatus: jest.Mock;
    let mockSetExecutionCount: jest.Mock;
    let mockSetSnackbarMessage: jest.Mock;
    let mockSetSnackbarSeverity: jest.Mock;
    let mockSetSnackbarOpen: jest.Mock;
    let digitalTwin: DigitalTwin;
    let gitlabInstance: GitlabInstance;
  
    beforeEach(() => {
      mockSetButtonText = jest.fn();
      mockSetJobLogs = jest.fn();
      mockSetPipelineCompleted = jest.fn();
      mockSetPipelineLoading = jest.fn();
      mockSetExecutionStatus = jest.fn();
      mockSetExecutionCount = jest.fn();
      mockSetSnackbarMessage = jest.fn();
      mockSetSnackbarSeverity = jest.fn();
      mockSetSnackbarOpen = jest.fn();
      gitlabInstance = new GitlabInstance('user1', 'authority', 'token1');
      digitalTwin = new DigitalTwin('DTName', gitlabInstance);
    });
  
    it('should handle button click with Start text', async () => {
      await handleButtonClick(
        'Start',
        mockSetButtonText,
        mockSetJobLogs,
        mockSetPipelineCompleted,
        mockSetPipelineLoading,
        mockSetExecutionStatus,
        mockSetExecutionCount,
        digitalTwin,
        mockSetSnackbarMessage,
        mockSetSnackbarSeverity,
        mockSetSnackbarOpen,
        0,
      );
  
      expect(mockSetButtonText).toHaveBeenCalledWith('Stop');
      expect(mockSetJobLogs).toHaveBeenCalledWith([]);
    });
  
    it('should call handleStop when buttonText is not "Start"', async () => {
      digitalTwin.stop = jest.fn();
  
      await handleButtonClick(
        'Stop',
        mockSetButtonText,
        mockSetJobLogs,
        mockSetPipelineCompleted,
        mockSetPipelineLoading,
        mockSetExecutionStatus,
        mockSetExecutionCount,
        digitalTwin,
        mockSetSnackbarMessage,
        mockSetSnackbarSeverity,
        mockSetSnackbarOpen,
        1,
      );
  
      expect(mockSetButtonText).toHaveBeenCalledWith('Start');
     });
  
    it('should check first pipeline status', async () => {
      gitlabInstance.projectId = 1;
      gitlabInstance.getPipelineStatus = jest.fn().mockResolvedValue('success');
      await checkFirstPipelineStatus(
        gitlabInstance,
        1,
        mockSetJobLogs,
        mockSetPipelineCompleted,
        mockSetPipelineLoading,
        mockSetButtonText,
      );
  
      expect(gitlabInstance.getPipelineStatus).toHaveBeenCalledWith('user1', 1);
      expect(mockSetPipelineCompleted).toHaveBeenCalledWith(true);
    });
  
    it('should fetch job logs', async () => {
      gitlabInstance.getPipelineJobs = jest
        .fn()
        .mockResolvedValue([{ id: 1, name: 'Job1' }]);
      gitlabInstance.getJobTrace = jest.fn().mockResolvedValue('log content');
  
      const logs = await fetchJobLogs(gitlabInstance, 1);
  
      expect(gitlabInstance.getPipelineJobs).toHaveBeenCalledWith('user1', 1);
      expect(gitlabInstance.getJobTrace).toHaveBeenCalledWith('user1', 1);
      expect(logs).toEqual([{ jobName: 'Job1', log: 'log content' }]);
    });
  
    it('should handle pipeline completion', async () => {
      gitlabInstance.getPipelineStatus = jest.fn().mockResolvedValue('success');
      await handlePipelineCompletion(
        gitlabInstance,
        2,
        mockSetJobLogs,
        mockSetPipelineCompleted,
        mockSetPipelineLoading,
        mockSetButtonText,
      );
  
      expect(gitlabInstance.getPipelineStatus).toHaveBeenCalled();
    });
  
    it('should retry pipeline check', () => {
      jest.useFakeTimers();
      retryPipelineCheck(
        gitlabInstance,
        1,
        mockSetJobLogs,
        mockSetPipelineCompleted,
        mockSetPipelineLoading,
        mockSetButtonText,
      );
      jest.advanceTimersByTime(5000);
  
      expect(gitlabInstance.getPipelineStatus).toHaveBeenCalled();
    });
  
    it('should handle stop execution with success', async () => {
      digitalTwin.stop = jest.fn().mockResolvedValue(true);
  
      await handleStop(
        digitalTwin,
        mockSetSnackbarMessage,
        mockSetSnackbarSeverity,
        mockSetSnackbarOpen,
        0,
        mockSetButtonText,
        mockSetPipelineCompleted,
        mockSetPipelineLoading,
      );
  
      expect(mockSetSnackbarMessage).toHaveBeenCalledWith(
        'DTName (Run #0) execution stopped successfully',
      );
      expect(mockSetSnackbarSeverity).toHaveBeenCalledWith('success');
      expect(mockSetButtonText).toHaveBeenCalledWith('Start');
    });
  });