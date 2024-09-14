import { Dispatch, SetStateAction } from 'react';
import { AlertColor } from '@mui/material';
import DigitalTwin from 'util/gitlabDigitalTwin';
import { GitlabInstance } from 'util/gitlab';
import { useDispatch } from 'react-redux';
import {
  startPipeline,
  updatePipelineState,
  updatePipelineStateOnCompletion,
  updatePipelineStateOnStop,
  fetchJobLogs,
} from 'preview/route/digitaltwins/execute/pipelineUtils';
import {
  setJobLogs,
  setPipelineCompleted,
  setPipelineLoading,
} from 'store/digitalTwin.slice';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
}));

jest.mock('store/digitalTwin.slice', () => ({
  setJobLogs: jest.fn(),
  setPipelineCompleted: jest.fn(),
  setPipelineLoading: jest.fn(),
}));

describe('startPipeline', () => {
  let digitalTwin: DigitalTwin;
  let setSnackbarMessage: Dispatch<SetStateAction<string>>;
  let setSnackbarSeverity: Dispatch<SetStateAction<AlertColor>>;
  let setSnackbarOpen: Dispatch<SetStateAction<boolean>>;

  beforeEach(() => {
    digitalTwin = {
      DTName: 'TestDT',
      lastExecutionStatus: 'success',
      execute: jest.fn(),
    } as unknown as DigitalTwin;
    setSnackbarMessage = jest.fn();
    setSnackbarSeverity = jest.fn();
    setSnackbarOpen = jest.fn();
  });

  it('should call execute and set success message if execution is successful', async () => {
    await startPipeline(
      digitalTwin,
      setSnackbarMessage,
      setSnackbarSeverity,
      setSnackbarOpen
    );

    expect(digitalTwin.execute).toHaveBeenCalled();
    expect(setSnackbarMessage).toHaveBeenCalledWith(
      `Execution started successfully for TestDT. Wait until completion for the logs...`
    );
    expect(setSnackbarSeverity).toHaveBeenCalledWith('success');
    expect(setSnackbarOpen).toHaveBeenCalledWith(true);
  });

  it('should set error message if execution fails', async () => {
    digitalTwin.lastExecutionStatus = 'error';
    await startPipeline(
      digitalTwin,
      setSnackbarMessage,
      setSnackbarSeverity,
      setSnackbarOpen
    );

    expect(setSnackbarMessage).toHaveBeenCalledWith(
      `Execution error for TestDT`
    );
    expect(setSnackbarSeverity).toHaveBeenCalledWith('error');
    expect(setSnackbarOpen).toHaveBeenCalledWith(true);
  });
});

describe('updatePipelineState', () => {
  let digitalTwin: DigitalTwin;
  let dispatch: ReturnType<typeof useDispatch>;

  beforeEach(() => {
    digitalTwin = { DTName: 'TestDT' } as DigitalTwin;
    dispatch = jest.fn();
  });

  it('should dispatch setPipelineCompleted and setPipelineLoading actions', () => {
    updatePipelineState(digitalTwin, dispatch);

    expect(dispatch).toHaveBeenCalledWith(
      setPipelineCompleted({ assetName: 'TestDT', pipelineCompleted: false })
    );
    expect(dispatch).toHaveBeenCalledWith(
      setPipelineLoading({ assetName: 'TestDT', pipelineLoading: true })
    );
  });
});

describe('updatePipelineStateOnCompletion', () => {
  let digitalTwin: DigitalTwin;
  let dispatch: ReturnType<typeof useDispatch>;
  let setButtonText: Dispatch<SetStateAction<string>>;
  let setLogButtonDisabled: Dispatch<SetStateAction<boolean>>;
  let jobLogs: { jobName: string; log: string }[];

  beforeEach(() => {
    digitalTwin = { DTName: 'TestDT' } as DigitalTwin;
    dispatch = jest.fn();
    setButtonText = jest.fn();
    setLogButtonDisabled = jest.fn();
    jobLogs = [{ jobName: 'TestJob', log: 'Test log' }];
  });

  it('should dispatch actions and reset button states on completion', () => {
    updatePipelineStateOnCompletion(
      digitalTwin,
      jobLogs,
      setButtonText,
      setLogButtonDisabled,
      dispatch
    );

    expect(dispatch).toHaveBeenCalledWith(
      setJobLogs({ assetName: 'TestDT', jobLogs })
    );
    expect(dispatch).toHaveBeenCalledWith(
      setPipelineCompleted({ assetName: 'TestDT', pipelineCompleted: true })
    );
    expect(dispatch).toHaveBeenCalledWith(
      setPipelineLoading({ assetName: 'TestDT', pipelineLoading: false })
    );
    expect(setButtonText).toHaveBeenCalledWith('Start');
    expect(setLogButtonDisabled).toHaveBeenCalledWith(false);
  });
});

describe('updatePipelineStateOnStop', () => {
  let digitalTwin: DigitalTwin;
  let dispatch: ReturnType<typeof useDispatch>;
  let setButtonText: Dispatch<SetStateAction<string>>;

  beforeEach(() => {
    digitalTwin = { DTName: 'TestDT' } as DigitalTwin;
    dispatch = jest.fn();
    setButtonText = jest.fn();
  });

  it('should dispatch actions and reset button state on stop', () => {
    updatePipelineStateOnStop(digitalTwin, setButtonText, dispatch);

    expect(setButtonText).toHaveBeenCalledWith('Start');
    expect(dispatch).toHaveBeenCalledWith(
      setPipelineCompleted({ assetName: 'TestDT', pipelineCompleted: true })
    );
    expect(dispatch).toHaveBeenCalledWith(
      setPipelineLoading({ assetName: 'TestDT', pipelineLoading: false })
    );
  });
});

describe('fetchJobLogs', () => {
  let gitlabInstance: GitlabInstance;
  let pipelineId: number;

  beforeEach(() => {
    gitlabInstance = {
      projectId: 1,
      getPipelineJobs: jest.fn().mockResolvedValue([
        { id: 1, name: 'Job1' },
        { id: 2, name: 'Job2' },
      ]),
      getJobTrace: jest.fn().mockResolvedValue('Job log'),
    } as unknown as GitlabInstance;
    pipelineId = 1;
  });

  it('should fetch job logs and return parsed logs', async () => {
    const logs = await fetchJobLogs(gitlabInstance, pipelineId);

    expect(gitlabInstance.getPipelineJobs).toHaveBeenCalledWith(1, pipelineId);
    expect(gitlabInstance.getJobTrace).toHaveBeenCalledTimes(2);
    expect(logs).toEqual([
      { jobName: 'Job2', log: 'Job log' },
      { jobName: 'Job1', log: 'Job log' },
    ]);
  });
});
