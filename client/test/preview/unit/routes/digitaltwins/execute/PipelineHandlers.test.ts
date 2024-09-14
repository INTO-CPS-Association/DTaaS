import { Dispatch, SetStateAction } from 'react';
import { AlertColor } from '@mui/material';
import DigitalTwin, { formatName } from 'util/gitlabDigitalTwin';
import { useDispatch } from 'react-redux';
import {
  updatePipelineState,
  updatePipelineStateOnStop,
} from 'preview/route/digitaltwins/execute/pipelineUtils';
import { startPipelineStatusCheck } from 'preview/route/digitaltwins/execute/pipelineChecks';
import { handleButtonClick, handleStart, handleStop, stopPipelines, setSnackbar } from 'preview/route/digitaltwins/execute/pipelineHandler';

jest.mock('util/gitlabDigitalTwin', () => ({
  ...jest.requireActual('util/gitlabDigitalTwin'),
  formatName: jest.fn(),
}));

jest.mock('preview/route/digitaltwins/execute/pipelineUtils', () => ({
  startPipeline: jest.fn(),
  updatePipelineState: jest.fn(),
  updatePipelineStateOnStop: jest.fn(),
}));

jest.mock('preview/route/digitaltwins/execute/pipelineChecks', () => ({
  startPipelineStatusCheck: jest.fn(),
}));

describe('handleButtonClick', () => {
    let setButtonText: Dispatch<SetStateAction<string>>;
    let setSnackbarMessage: Dispatch<SetStateAction<string>>;
    let setSnackbarSeverity: Dispatch<SetStateAction<AlertColor>>;
    let setSnackbarOpen: Dispatch<SetStateAction<boolean>>;
    let setLogButtonDisabled: Dispatch<SetStateAction<boolean>>;
    let dispatch: ReturnType<typeof useDispatch>;
    const digitalTwin = {} as DigitalTwin;
  
    beforeEach(() => {
      setButtonText = jest.fn();
      setSnackbarMessage = jest.fn();
      setSnackbarSeverity = jest.fn();
      setSnackbarOpen = jest.fn();
      setLogButtonDisabled = jest.fn();
      dispatch = jest.fn() as any;
    });
  
    it('should call handleStart when buttonText is "Start"', () => {
      const handleStartSpy = jest.spyOn(require('preview/route/digitaltwins/execute/pipelineHandler'), 'handleStart');
      
      handleButtonClick(
        'Start',
        setButtonText,
        digitalTwin,
        setSnackbarMessage,
        setSnackbarSeverity,
        setSnackbarOpen,
        setLogButtonDisabled,
        dispatch
      );
  
      expect(handleStartSpy).toHaveBeenCalledWith(
        'Start',
        setButtonText,
        setSnackbarMessage,
        setSnackbarSeverity,
        setSnackbarOpen,
        digitalTwin,
        setLogButtonDisabled,
        dispatch
      );
  
      handleStartSpy.mockRestore();
    });
  
    it('should call handleStop when buttonText is not "Start"', () => {
      const handleStopSpy = jest.spyOn(require('preview/route/digitaltwins/execute/pipelineHandler'), 'handleStop');
  
      handleButtonClick(
        'Stop',
        setButtonText,
        digitalTwin,
        setSnackbarMessage,
        setSnackbarSeverity,
        setSnackbarOpen,
        setLogButtonDisabled,
        dispatch
      );
  
      expect(handleStopSpy).toHaveBeenCalledWith(
        digitalTwin,
        setSnackbarMessage,
        setSnackbarSeverity,
        setSnackbarOpen,
        setButtonText,
        dispatch
      );
  
      handleStopSpy.mockRestore();
    });
  });
  

  
  describe('handleStart', () => {
    let setButtonText: Dispatch<SetStateAction<string>>;
    let setSnackbarMessage: Dispatch<SetStateAction<string>>;
    let setSnackbarSeverity: Dispatch<SetStateAction<AlertColor>>;
    let setSnackbarOpen: Dispatch<SetStateAction<boolean>>;
    let setLogButtonDisabled: Dispatch<SetStateAction<boolean>>;
    let dispatch: ReturnType<typeof useDispatch>;

    const digitalTwin = {} as DigitalTwin;
  
    beforeEach(() => {
      setButtonText = jest.fn();
      setSnackbarMessage = jest.fn();
      setSnackbarSeverity = jest.fn();
      setSnackbarOpen = jest.fn();
      setLogButtonDisabled = jest.fn();
      dispatch = jest.fn() as any;
    });
  
    it('should set button text to "Stop" and disable log button', async () => {
      await handleStart(
        'Start',
        setButtonText,
        setSnackbarMessage,
        setSnackbarSeverity,
        setSnackbarOpen,
        digitalTwin,
        setLogButtonDisabled,
        dispatch
      );
  
      expect(setButtonText).toHaveBeenCalledWith('Stop');
      expect(setLogButtonDisabled).toHaveBeenCalledWith(true);
      expect(updatePipelineState).toHaveBeenCalledWith(digitalTwin, dispatch);
      expect(startPipelineStatusCheck).toHaveBeenCalled();
    });
  
    it('should not change button text if it is not "Start"', async () => {
      await handleStart(
        'Stop',
        setButtonText,
        setSnackbarMessage,
        setSnackbarSeverity,
        setSnackbarOpen,
        digitalTwin,
        setLogButtonDisabled,
        dispatch
      );
  
      expect(setButtonText).not.toHaveBeenCalledWith('Stop');
    });
  });

  describe('handleStop', () => {
    let setButtonText: Dispatch<SetStateAction<string>>;
    let setSnackbarMessage: Dispatch<SetStateAction<string>>;
    let setSnackbarSeverity: Dispatch<SetStateAction<AlertColor>>;
    let setSnackbarOpen: Dispatch<SetStateAction<boolean>>;
    let dispatch: ReturnType<typeof useDispatch>;
    const digitalTwin = {
      DTName: 'TestDTName',
      gitlabInstance: { projectId: 1 },
      pipelineId: 1,
      stop: jest.fn(),
    } as unknown as DigitalTwin;
  
    beforeEach(() => {
      setButtonText = jest.fn();
      setSnackbarMessage = jest.fn();
      setSnackbarSeverity = jest.fn();
      setSnackbarOpen = jest.fn();
      dispatch = jest.fn() as any;
    });
  
    it('should call stopPipelines and setSnackbar on success', async () => {
      const stopPipelinesSpy = jest.spyOn(require('preview/route/digitaltwins/execute/pipelineHandler'), 'stopPipelines');
      stopPipelinesSpy.mockResolvedValueOnce(undefined);
  
      await handleStop(
        digitalTwin,
        setSnackbarMessage,
        setSnackbarSeverity,
        setSnackbarOpen,
        setButtonText,
        dispatch
      );
  
      expect(stopPipelinesSpy).toHaveBeenCalledWith(digitalTwin);
      expect(setSnackbarMessage).toHaveBeenCalledWith(`Execution stopped successfully for ${formatName(digitalTwin.DTName)}`);
      expect(setSnackbarSeverity).toHaveBeenCalledWith('success');
      expect(setSnackbarOpen).toHaveBeenCalledWith(true);
      expect(updatePipelineStateOnStop).toHaveBeenCalledWith(digitalTwin, setButtonText, dispatch);
      expect(updatePipelineStateOnStop).toHaveBeenCalledWith(digitalTwin, setButtonText, dispatch);
    });
  });

  describe('stopPipelines', () => {
    it('should call stop method twice with correct parameters', async () => {
      const stopMock = jest.fn().mockResolvedValue(undefined);
      const gitlabInstance = { projectId: 1 };
      const digitalTwin = {
        gitlabInstance,
        pipelineId: 1,
        stop: stopMock,
      } as unknown as DigitalTwin;
  
      // Call the stopPipelines function
      await stopPipelines(digitalTwin);
  
      // Assert that stop was called with the correct parameters
      expect(stopMock).toHaveBeenCalledTimes(2);
      expect(stopMock).toHaveBeenNthCalledWith(1, 1, 1);
      expect(stopMock).toHaveBeenNthCalledWith(2, 1, 2);
    });
  });
  describe('setSnackbar', () => {
    it('should set snackbar values correctly', () => {
      const setSnackbarMessage = jest.fn();
      const setSnackbarSeverity = jest.fn();
      const setSnackbarOpen = jest.fn();
  
      setSnackbar(
        'Test message',
        'success',
        setSnackbarMessage,
        setSnackbarSeverity,
        setSnackbarOpen
      );
  
      expect(setSnackbarMessage).toHaveBeenCalledWith('Test message');
      expect(setSnackbarSeverity).toHaveBeenCalledWith('success');
      expect(setSnackbarOpen).toHaveBeenCalledWith(true);
    });
  });
      