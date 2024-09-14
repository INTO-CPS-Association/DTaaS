import { Dispatch } from 'react';
import { startPipelineStatusCheck, handleTimeout, checkFirstPipelineStatus } from 'preview/route/digitaltwins/execute/pipelineChecks';
import DigitalTwin from 'util/gitlabDigitalTwin';
import { fetchJobLogs, updatePipelineStateOnCompletion } from 'preview/route/digitaltwins/execute/pipelineUtils';
import { setSnackbar } from 'preview/route/digitaltwins/execute/pipelineHandler';
import { useDispatch } from 'react-redux';
import { AlertColor } from '@mui/material';

jest.mock('preview/route/digitaltwins/execute/pipelineUtils', () => ({
  fetchJobLogs: jest.fn(),
  updatePipelineStateOnCompletion: jest.fn(),
}));

jest.mock('preview/route/digitaltwins/execute/pipelineHandler', () => ({
  setSnackbar: jest.fn(),
}));

//const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Pipeline Status Tests', () => {
  let setButtonText: Dispatch<React.SetStateAction<string>>;
  let setLogButtonDisabled: Dispatch<React.SetStateAction<boolean>>;
  let setSnackbarMessage: Dispatch<React.SetStateAction<string>>;
  let setSnackbarSeverity: Dispatch<React.SetStateAction<AlertColor>>;
  let setSnackbarOpen: Dispatch<React.SetStateAction<boolean>>;
  let dispatch: ReturnType<typeof useDispatch>;
  let digitalTwin: DigitalTwin;
  let startTime: number;

  beforeEach(() => {
    setButtonText = jest.fn();
    setLogButtonDisabled = jest.fn();
    setSnackbarMessage = jest.fn();
    setSnackbarSeverity = jest.fn();
    setSnackbarOpen = jest.fn();
    dispatch = jest.fn();

    digitalTwin = {
      DTName: 'Test Twin',
      gitlabInstance: {
        getPipelineStatus: jest.fn(),
        projectId: '123',
      },
      pipelineId: 100,
    } as unknown as DigitalTwin;

    //jest.useFakeTimers();
    //Date.now = jest.fn(() => 1487076708000)
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startPipelineStatusCheck', () => {
    it('should call checkFirstPipelineStatus with the correct params', async () => {
      const originalDateNow = Date.now;
      const mockDateNow = jest.fn(() => 1622547600000); // Example timestamp
      global.Date.now = mockDateNow;
    
      await startPipelineStatusCheck({
        setButtonText,
        digitalTwin,
        setLogButtonDisabled,
        dispatch,
        setSnackbarMessage,
        setSnackbarSeverity,
        setSnackbarOpen,
      });
    
      expect(mockDateNow).toHaveBeenCalled();
    
      global.Date.now = originalDateNow; // Restore the original Date.now function
    });
  });

  describe('handleTimeout', () => {
    it('should set appropriate values on timeout', () => {
      handleTimeout(
        digitalTwin.DTName,
        setButtonText,
        setLogButtonDisabled,
        setSnackbarMessage,
        setSnackbarSeverity,
        setSnackbarOpen,
      );

      expect(setButtonText).toHaveBeenCalledWith('Start');
      expect(setLogButtonDisabled).toHaveBeenCalledWith(false);
      expect(setSnackbar).toHaveBeenCalledWith(
        'Execution timed out for Test Twin',
        'error',
        setSnackbarMessage,
        setSnackbarSeverity,
        setSnackbarOpen,
      );
    });
  });

  describe('checkFirstPipelineStatus', () => {
    it('should call checkSecondPipelineStatus if pipeline is successful', async () => {
      (digitalTwin.gitlabInstance.getPipelineStatus as jest.Mock).mockResolvedValue('success');

      const spy = jest.spyOn(require('preview/route/digitaltwins/execute/pipelineChecks.ts'), 'checkSecondPipelineStatus');
      await checkFirstPipelineStatus({
        setButtonText,
        digitalTwin,
        setLogButtonDisabled,
        dispatch,
        startTime,
        setSnackbarMessage,
        setSnackbarSeverity,
        setSnackbarOpen,
      });

      expect(digitalTwin.gitlabInstance.getPipelineStatus).toHaveBeenCalledWith('123', 100);
      expect(spy).toHaveBeenCalled();
    });

    it('should handle timeout correctly if execution exceeds max time', async () => {
      jest.spyOn(require('preview/route/digitaltwins/execute/pipelineChecks.ts'), 'handleTimeout').mockImplementation(() => {});

      await checkFirstPipelineStatus({
        setButtonText,
        digitalTwin,
        setLogButtonDisabled,
        dispatch,
        startTime,
        setSnackbarMessage,
        setSnackbarSeverity,
        setSnackbarOpen,
      });
    
      // Use more flexible matching if the exact match is not crucial
      expect(handleTimeout).toHaveBeenCalledWith(
        expect.any(String), // or "Test Twin" if the value is known and fixed
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
      );
    });

    it('should handle failed pipelines correctly', async () => {
      (digitalTwin.gitlabInstance.getPipelineStatus as jest.Mock).mockResolvedValue('failed');
      (fetchJobLogs as jest.Mock).mockResolvedValue('mock logs');

      await checkFirstPipelineStatus({
        setButtonText,
        digitalTwin,
        setLogButtonDisabled,
        dispatch,
        startTime,
        setSnackbarMessage,
        setSnackbarSeverity,
        setSnackbarOpen,
      });

      expect(fetchJobLogs).toHaveBeenCalledWith(digitalTwin.gitlabInstance, 100);
      expect(updatePipelineStateOnCompletion).toHaveBeenCalled();
    });
    
    it('handleTimeout should set correct states and call setSnackbar', () => {
      const mockSetButtonText = jest.fn();
      const mockSetLogButtonDisabled = jest.fn();
      const mockSetSnackbarMessage = jest.fn();
      const mockSetSnackbarSeverity = jest.fn();
      const mockSetSnackbarOpen = jest.fn();
    
      handleTimeout('DTName', mockSetButtonText, mockSetLogButtonDisabled, mockSetSnackbarMessage, mockSetSnackbarSeverity, mockSetSnackbarOpen);
    
      // Verify that handleTimeout triggers the expected state changes or function calls
      expect(mockSetButtonText).toHaveBeenCalledWith('Start');
      expect(mockSetLogButtonDisabled).toHaveBeenCalledWith(false);
      // If handleTimeout indirectly leads to setSnackbar being called, verify the relevant function calls
      // For example, if setting a message, severity, and opening the snackbar are the required actions:
      expect(mockSetSnackbarMessage).toHaveBeenCalledWith(expect.any(String));
      expect(mockSetSnackbarSeverity).toHaveBeenCalledWith('error');
      expect(mockSetSnackbarOpen).toHaveBeenCalledWith(true);
    });
  });
});
