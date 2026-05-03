import { useSelector } from 'react-redux';
import { RootState } from 'store/store';

/**
 * React hook accessors for settings stored in the Redux store.
 *
 * - Default values are defined in
 *   model/backend/gitlab/constants.ts
 *
 * - Non-hook variants are in
 *   model/backend/gitlab/digitalTwinConfig/settingsUtility.ts
 *
 * - Settings can be overridden by the user in the Settings tab
 */
export const useGroupName = (): string => {
  const groupName = useSelector(
    (state: RootState) => state.settings.GROUP_NAME,
  );
  return groupName;
};

export const useDTDirectory = (): string => {
  const dtDirectory = useSelector(
    (state: RootState) => state.settings.DT_DIRECTORY,
  );
  return dtDirectory;
};

export const useCommonLibraryProjectName = (): string => {
  const commonLibraryProjectName = useSelector(
    (state: RootState) => state.settings.COMMON_LIBRARY_PROJECT_NAME,
  );
  return commonLibraryProjectName;
};

export const useRunnerTag = (): string => {
  const runnerTag = useSelector(
    (state: RootState) => state.settings.RUNNER_TAG,
  );
  return runnerTag;
};

export const useBranchName = (): string => {
  const branchName = useSelector(
    (state: RootState) => state.settings.BRANCH_NAME,
  );
  return branchName;
};

export const useMeasurementTrials = (): number => {
  const measurementTrials = useSelector(
    (state: RootState) => state.settings.trials,
  );
  return measurementTrials;
};

export const useMeasurementSecondaryRunnerTag = (): string => {
  const measurementSecondaryRunnerTag = useSelector(
    (state: RootState) => state.settings.secondaryRunnerTag,
  );
  return measurementSecondaryRunnerTag;
};
