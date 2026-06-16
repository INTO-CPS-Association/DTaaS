import type { PayloadAction } from '@reduxjs/toolkit';
import type { AppDispatch } from 'store/store';
import {
  setGroupName,
  setDTDirectory,
  setCommonLibraryProjectName,
  setRunnerTag,
  setBranchName,
  setTrials,
  setSecondaryRunnerTag,
  setPrimaryDTName,
  setSecondaryDTName,
} from 'store/settings.slice';

export interface FormValues {
  [key: string]: string;
  groupName: string;
  dtDirectory: string;
  commonLibraryProjectName: string;
  runnerTag: string;
  branchName: string;
  measurementTrials: string;
  measurementSecondaryRunnerTag: string;
  measurementPrimaryDTName: string;
  measurementSecondaryDTName: string;
}

interface CurrentSettings {
  GROUP_NAME: string;
  DT_DIRECTORY: string;
  COMMON_LIBRARY_PROJECT_NAME: string;
  RUNNER_TAG: string;
  BRANCH_NAME: string;
  MEASUREMENT_TRIALS: number;
  MEASUREMENT_SECONDARY_RUNNER_TAG: string;
  MEASUREMENT_PRIMARY_DT_NAME: string;
  MEASUREMENT_SECONDARY_DT_NAME: string;
}

const requiredStringFields: Array<keyof Omit<FormValues, 'measurementTrials'>> =
  [
    'groupName',
    'dtDirectory',
    'commonLibraryProjectName',
    'runnerTag',
    'branchName',
    'measurementSecondaryRunnerTag',
    'measurementPrimaryDTName',
    'measurementSecondaryDTName',
  ];

function isInvalidTrials(value: string): boolean {
  const trialsValue = Number.parseInt(value, 10);
  return !value.trim() || Number.isNaN(trialsValue) || trialsValue < 1;
}

export function validateSettingsForm(
  formValues: FormValues,
): Record<string, boolean> {
  const errors: Record<string, boolean> = {};

  for (const field of requiredStringFields) {
    if (!formValues[field].trim()) {
      errors[field] = true;
    }
  }

  if (isInvalidTrials(formValues.measurementTrials)) {
    errors.measurementTrials = true;
  }

  return errors;
}

export function dispatchChangedSettings(
  dispatch: AppDispatch,
  formValues: FormValues,
  current: CurrentSettings,
): boolean {
  const stringChanges: Array<{
    value: string;
    current: string;
    action: (value: string) => PayloadAction<string>;
    triggersRefresh: boolean;
  }> = [
    {
      value: formValues.groupName,
      current: current.GROUP_NAME,
      action: setGroupName,
      triggersRefresh: true,
    },
    {
      value: formValues.dtDirectory,
      current: current.DT_DIRECTORY,
      action: setDTDirectory,
      triggersRefresh: true,
    },
    {
      value: formValues.commonLibraryProjectName,
      current: current.COMMON_LIBRARY_PROJECT_NAME,
      action: setCommonLibraryProjectName,
      triggersRefresh: true,
    },
    {
      value: formValues.runnerTag,
      current: current.RUNNER_TAG,
      action: setRunnerTag,
      triggersRefresh: false,
    },
    {
      value: formValues.branchName,
      current: current.BRANCH_NAME,
      action: setBranchName,
      triggersRefresh: true,
    },
    {
      value: formValues.measurementSecondaryRunnerTag,
      current: current.MEASUREMENT_SECONDARY_RUNNER_TAG,
      action: setSecondaryRunnerTag,
      triggersRefresh: false,
    },
    {
      value: formValues.measurementPrimaryDTName,
      current: current.MEASUREMENT_PRIMARY_DT_NAME,
      action: setPrimaryDTName,
      triggersRefresh: false,
    },
    {
      value: formValues.measurementSecondaryDTName,
      current: current.MEASUREMENT_SECONDARY_DT_NAME,
      action: setSecondaryDTName,
      triggersRefresh: false,
    },
  ];

  let needsRefresh = false;
  for (const change of stringChanges) {
    if (change.value !== change.current) {
      dispatch(change.action(change.value));
      if (change.triggersRefresh) {
        needsRefresh = true;
      }
    }
  }

  const trialsValue = Number.parseInt(formValues.measurementTrials, 10);
  if (
    !isInvalidTrials(formValues.measurementTrials) &&
    trialsValue !== current.MEASUREMENT_TRIALS
  ) {
    dispatch(setTrials(trialsValue));
  }

  return needsRefresh;
}
