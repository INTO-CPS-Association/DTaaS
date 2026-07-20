import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { z } from 'zod';
import {
  GROUP_NAME,
  DT_DIRECTORY,
  COMMON_LIBRARY_PROJECT_NAME,
  RUNNER_TAG,
  BRANCH_NAME,
} from 'model/backend/gitlab/digitalTwinConfig/constants';
import DEFAULT_MEASUREMENT from 'model/backend/gitlab/measure/constants';

export const isRemoteLoggerConfigured = (): boolean =>
  Boolean(globalThis.env?.LOGGER_URL?.trim());

export const getDefaultLoggingEnabled = (): boolean => false;

// Filled out from model/backend/gitlab/digitalTwinConfig/constants.ts
export const DEFAULT_SETTINGS = {
  GROUP_NAME,
  DT_DIRECTORY,
  COMMON_LIBRARY_PROJECT_NAME,
  RUNNER_TAG,
  BRANCH_NAME,
  loggingEnabled: getDefaultLoggingEnabled(),
  // Records whether a remote logger was configured when settings were
  // persisted, so local-only logging consent is not carried over once a
  // remote logger appears.
  remoteLoggerConfiguredAtSave: isRemoteLoggerConfigured(),
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
  loggingEnabled: boolean;
  remoteLoggerConfiguredAtSave: boolean;
}

const SettingsSchema = z
  .object({
    GROUP_NAME: z.string(),
    DT_DIRECTORY: z.string(),
    COMMON_LIBRARY_PROJECT_NAME: z.string(),
    RUNNER_TAG: z.string(),
    BRANCH_NAME: z.string(),
    trials: z.number(),
    secondaryRunnerTag: z.string(),
    primaryDTName: z.string(),
    secondaryDTName: z.string(),
    disabledTaskNames: z.array(z.string()),
    loggingEnabled: z.boolean(),
    remoteLoggerConfiguredAtSave: z.boolean(),
  })
  .partial();

type PersistedSettings = z.infer<typeof SettingsSchema>;

// Local-only logging consent is not consent to remote streaming; reapply the
// default until the user opts in while a remote logger is configured.
function applyRemoteLoggingConsent(
  persisted: PersistedSettings,
): PersistedSettings {
  if (!isRemoteLoggerConfigured() || persisted.remoteLoggerConfiguredAtSave) {
    return persisted;
  }
  return {
    ...persisted,
    loggingEnabled: getDefaultLoggingEnabled(),
    remoteLoggerConfiguredAtSave: true,
  };
}

function readPersistedSettings(base: SettingsState): SettingsState | null {
  const settings = localStorage.getItem('settings');
  if (!settings) return null;
  try {
    const result = SettingsSchema.safeParse(JSON.parse(settings));
    if (result.success)
      return { ...base, ...applyRemoteLoggingConsent(result.data) };
  } catch {
    // Malformed persisted settings; fall back to defaults.
  }
  return null;
}

export const loadInitialSettings = (): SettingsState => {
  const base = { ...DEFAULT_SETTINGS, ...DEFAULT_MEASUREMENT };
  return readPersistedSettings(base) ?? base;
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
    setLoggingEnabled: (state, action: PayloadAction<boolean>) => {
      state.loggingEnabled = action.payload;
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
  setLoggingEnabled,
  toggleTaskEnabled,
  resetToDefaults,
} = settingsSlice.actions;

export default settingsSlice.reducer;
