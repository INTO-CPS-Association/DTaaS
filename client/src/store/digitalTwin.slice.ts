// digitalTwinSlice.ts
import { AlertColor } from '@mui/material';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { GitlabInstance } from 'util/gitlab';
import DigitalTwin from 'util/gitlabDigitalTwin';

interface DigitalTwinState {
  gitlab: GitlabInstance | null;
  digitalTwin: DigitalTwin | null;
  description: string;
  executionStatus: string | null;
  snackbarOpen: boolean;
  snackbarMessage: string;
  snackbarSeverity: AlertColor;
  jobLogs: { jobName: string; log: string }[];
  showLog: boolean;
  pipelineCompleted: boolean;
  pipelineLoading: boolean;
  buttonText: string;
  executionCount: number;
}

const initialState: DigitalTwinState = {
  gitlab: null,
  digitalTwin: null,
  description: '',
  executionStatus: null,
  snackbarOpen: false,
  snackbarMessage: '',
  snackbarSeverity: 'success',
  jobLogs: [],
  showLog: false,
  pipelineCompleted: false,
  pipelineLoading: false,
  buttonText: 'Start',
  executionCount: 0,
};

const digitalTwinSlice = createSlice({
  name: 'digitalTwin',
  initialState,
  reducers: {
    setGitlab: (state, action: PayloadAction<GitlabInstance | null>) => {
        state.gitlab = action.payload;
    },
    setDigitalTwin: (state, action: PayloadAction<DigitalTwin | null>) => {
      state.digitalTwin = action.payload;
    },
    setDescription: (state, action: PayloadAction<string>) => {
      state.description = action.payload;
    },
    setExecutionStatus: (state, action: PayloadAction<string | null>) => {
      state.executionStatus = action.payload;
    },
    setSnackbarOpen: (state, action: PayloadAction<boolean>) => {
      state.snackbarOpen = action.payload;
    },
    setSnackbarMessage: (state, action: PayloadAction<string>) => {
      state.snackbarMessage = action.payload;
    },
    setSnackbarSeverity: (state, action: PayloadAction<AlertColor>) => {
      state.snackbarSeverity = action.payload;
    },
    setJobLogs: (state, action: PayloadAction<{ jobName: string; log: string }[]>) => {
      state.jobLogs = action.payload;
    },
    setShowLog: (state, action: PayloadAction<boolean>) => {
      state.showLog = action.payload;
    },
    setPipelineCompleted: (state, action: PayloadAction<boolean>) => {
      state.pipelineCompleted = action.payload;
    },
    setPipelineLoading: (state, action: PayloadAction<boolean>) => {
      state.pipelineLoading = action.payload;
    },
    setButtonText: (state, action: PayloadAction<string>) => {
      state.buttonText = action.payload;
    },
    setExecutionCount: (state, action: PayloadAction<number>) => {
      state.executionCount = action.payload;
    },
  },
});

export const {
  setGitlab,
  setDigitalTwin,
  setDescription,
  setExecutionStatus,
  setSnackbarOpen,
  setSnackbarMessage,
  setSnackbarSeverity,
  setJobLogs,
  setShowLog,
  setPipelineCompleted,
  setPipelineLoading,
  setButtonText,
  setExecutionCount,
} = digitalTwinSlice.actions;

export const selectGitlab = (state: { digitalTwin: DigitalTwinState }) => state.digitalTwin.gitlab;
export const selectDigitalTwin = (state: { digitalTwin: DigitalTwinState }) => state.digitalTwin;

export default digitalTwinSlice.reducer;