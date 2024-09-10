import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import DigitalTwin from 'util/gitlabDigitalTwin';
import { JobLog } from 'components/asset/StartStopButton';
import { RootState } from './store';

interface DigitalTwinState {
  [key: string]: DigitalTwin;
}

const initialState: DigitalTwinState = {};

const digitalTwinSlice = createSlice({
  name: 'digitalTwin',
  initialState,
  reducers: {
    setDigitalTwin: (
      state,
      action: PayloadAction<{ assetName: string; digitalTwin: DigitalTwin }>,
    ) => {
      state[action.payload.assetName] = action.payload.digitalTwin;
    },
    incrementExecutionCount: (
      state,
      action: PayloadAction<{ assetName: string }>,
    ) => {
      const digitalTwin = state[action.payload.assetName];
      if (digitalTwin) {
        digitalTwin.executionCount += 1;
      }
    },
    setJobLogs: (
      state,
      action: PayloadAction<{ assetName: string; jobLogs: JobLog[] }>,
    ) => {
      const digitalTwin = state[action.payload.assetName];
      if (digitalTwin) {
        digitalTwin.jobLogs = action.payload.jobLogs;
      }
    },
    setPipelineCompleted: (
      state,
      action: PayloadAction<{ assetName: string; pipelineCompleted: boolean }>,
    ) => {
      const digitalTwin = state[action.payload.assetName];
      if (digitalTwin) {
        digitalTwin.pipelineCompleted = action.payload.pipelineCompleted;
      }
    },
    setPipelineLoading: (
      state,
      action: PayloadAction<{ assetName: string; pipelineLoading: boolean }>,
    ) => {
      const digitalTwin = state[action.payload.assetName];
      if (digitalTwin) {
        digitalTwin.pipelineLoading = action.payload.pipelineLoading;
      }
    },
  },
});

export const selectDigitalTwinByName = (name: string) => (state: RootState) =>
  state.digitalTwin[name];

export const {
  setDigitalTwin,
  incrementExecutionCount,
  setJobLogs,
  setPipelineCompleted,
  setPipelineLoading,
} = digitalTwinSlice.actions;
export default digitalTwinSlice.reducer;
