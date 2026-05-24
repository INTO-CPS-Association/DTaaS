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

export function validateSettingsForm(
  formValues: FormValues,
): Record<string, boolean> {
  const errors: Record<string, boolean> = {};

  for (const field of requiredStringFields) {
    if (!formValues[field].trim()) {
      errors[field] = true;
    }
  }

  const trialsValue = Number.parseInt(formValues.measurementTrials, 10);
  if (
    !formValues.measurementTrials.trim() ||
    Number.isNaN(trialsValue) ||
    trialsValue < 1
  ) {
    errors.measurementTrials = true;
  }

  return errors;
}

export function dispatchChangedSettings(
  dispatch: AppDispatch,
  formValues: FormValues,
  current: CurrentSettings,
): boolean {
  const needsRefresh =
    formValues.branchName !== current.BRANCH_NAME ||
    formValues.dtDirectory !== current.DT_DIRECTORY ||
    formValues.groupName !== current.GROUP_NAME ||
    formValues.commonLibraryProjectName !== current.COMMON_LIBRARY_PROJECT_NAME;

  if (formValues.groupName !== current.GROUP_NAME) {
    dispatch(setGroupName(formValues.groupName));
  }
  if (formValues.dtDirectory !== current.DT_DIRECTORY) {
    dispatch(setDTDirectory(formValues.dtDirectory));
  }
  if (
    formValues.commonLibraryProjectName !== current.COMMON_LIBRARY_PROJECT_NAME
  ) {
    dispatch(setCommonLibraryProjectName(formValues.commonLibraryProjectName));
  }
  if (formValues.runnerTag !== current.RUNNER_TAG) {
    dispatch(setRunnerTag(formValues.runnerTag));
  }
  if (formValues.branchName !== current.BRANCH_NAME) {
    dispatch(setBranchName(formValues.branchName));
  }
  const trialsValue = Number.parseInt(formValues.measurementTrials, 10);
  if (trialsValue !== current.MEASUREMENT_TRIALS) {
    dispatch(setTrials(trialsValue));
  }
  if (
    formValues.measurementSecondaryRunnerTag !==
    current.MEASUREMENT_SECONDARY_RUNNER_TAG
  ) {
    dispatch(setSecondaryRunnerTag(formValues.measurementSecondaryRunnerTag));
  }
  if (
    formValues.measurementPrimaryDTName !== current.MEASUREMENT_PRIMARY_DT_NAME
  ) {
    dispatch(setPrimaryDTName(formValues.measurementPrimaryDTName));
  }
  if (
    formValues.measurementSecondaryDTName !==
    current.MEASUREMENT_SECONDARY_DT_NAME
  ) {
    dispatch(setSecondaryDTName(formValues.measurementSecondaryDTName));
  }

  return needsRefresh;
}
