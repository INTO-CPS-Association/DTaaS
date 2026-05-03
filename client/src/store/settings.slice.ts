import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  GROUP_NAME,
  DT_DIRECTORY,
  COMMON_LIBRARY_PROJECT_NAME,
  RUNNER_TAG,
  BRANCH_NAME,
} from 'model/backend/gitlab/digitalTwinConfig/constants';
import DEFAULT_MEASUREMENT from 'model/backend/gitlab/measure/constants';

// Filled out from model/backend/gitlab/digitalTwinConfig/constants.ts
export const DEFAULT_SETTINGS = {
  GROUP_NAME,
  DT_DIRECTORY,
  COMMON_LIBRARY_PROJECT_NAME,
  RUNNER_TAG,
  BRANCH_NAME,
};

export { DEFAULT_MEASUREMENT };

interface SettingsState {
  GROUP_NAME: string;
  DT_DIRECTORY: string;
  COMMON_LIBRARY_PROJECT_NAME: string;
  RUNNER_TAG: string;
  BRANCH_NAME: string;
  trials: number;
  secondaryRunnerTag: string;
  primaryDTName: string;
  secondaryDTName: string;
  disabledTaskNames: string[];
}

export const loadInitialSettings = (): SettingsState => {
  const base = { ...DEFAULT_SETTINGS, ...DEFAULT_MEASUREMENT };
  const settings = localStorage.getItem('settings');
  if (settings) {
    const parsed = JSON.parse(settings);
    if (parsed && typeof parsed === 'object') {
      return { ...base, ...parsed };
    }
  }
  return base;
};

export const settingsSlice = createSlice({
  name: 'settings',
  initialState: loadInitialSettings(),
  reducers: {
    setGroupName: (state, action: PayloadAction<string>) => {
      state.GROUP_NAME = action.payload;
    },
    setDTDirectory: (state, action: PayloadAction<string>) => {
      state.DT_DIRECTORY = action.payload;
    },
    setCommonLibraryProjectName: (state, action: PayloadAction<string>) => {
      state.COMMON_LIBRARY_PROJECT_NAME = action.payload;
    },
    setRunnerTag: (state, action: PayloadAction<string>) => {
      state.RUNNER_TAG = action.payload;
    },
    setBranchName: (state, action: PayloadAction<string>) => {
      state.BRANCH_NAME = action.payload;
    },
    setTrials: (state, action: PayloadAction<number>) => {
      state.trials = action.payload;
    },
    setSecondaryRunnerTag: (state, action: PayloadAction<string>) => {
      state.secondaryRunnerTag = action.payload;
    },
    setPrimaryDTName: (state, action: PayloadAction<string>) => {
      state.primaryDTName = action.payload;
    },
    setSecondaryDTName: (state, action: PayloadAction<string>) => {
      state.secondaryDTName = action.payload;
    },
    toggleTaskEnabled: (state, action: PayloadAction<string>) => {
      const name = action.payload;
      const idx = state.disabledTaskNames.indexOf(name);
      if (idx === -1) {
        state.disabledTaskNames.push(name);
      } else {
        state.disabledTaskNames.splice(idx, 1);
      }
    },
    resetToDefaults: (state) => {
      Object.assign(state, DEFAULT_SETTINGS, DEFAULT_MEASUREMENT);
    },
  },
});

export const {
  setGroupName,
  setDTDirectory,
  setCommonLibraryProjectName,
  setRunnerTag,
  setBranchName,
  setTrials,
  setSecondaryRunnerTag,
  setPrimaryDTName,
  setSecondaryDTName,
  toggleTaskEnabled,
  resetToDefaults,
} = settingsSlice.actions;

export default settingsSlice.reducer;
