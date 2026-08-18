import {
  getBranchName,
  getCommonLibraryProjectName,
  getDTDirectory,
  getGroupName,
  getLoggingEnabled,
  getRunnerTag,
  resetSettingsStore,
  setSettingsStore,
} from 'src/gitlab/digitalTwinConfig/settingsUtility';

const settings = {
  GROUP_NAME: 'dtaas',
  DT_DIRECTORY: 'digital_twins',
  COMMON_LIBRARY_PROJECT_NAME: 'common',
  RUNNER_TAG: 'linux',
  BRANCH_NAME: 'main',
  loggingEnabled: false,
  remoteLoggingEnabled: false,
};

describe('settingsUtility', () => {
  beforeEach(() => {
    Object.assign(settings, {
      GROUP_NAME: 'dtaas',
      DT_DIRECTORY: 'digital_twins',
      COMMON_LIBRARY_PROJECT_NAME: 'common',
      RUNNER_TAG: 'linux',
      BRANCH_NAME: 'main',
      loggingEnabled: false,
    });
    setSettingsStore({ getState: () => ({ settings }) });
  });

  afterEach(resetSettingsStore);

  it('returns values from the configured core settings store', () => {
    Object.assign(settings, {
      GROUP_NAME: 'test-group',
      DT_DIRECTORY: 'test-directory',
      COMMON_LIBRARY_PROJECT_NAME: 'test-library',
      RUNNER_TAG: 'test-runner',
      BRANCH_NAME: 'test-branch',
      loggingEnabled: true,
    });

    expect(getGroupName()).toBe('test-group');
    expect(getDTDirectory()).toBe('test-directory');
    expect(getCommonLibraryProjectName()).toBe('test-library');
    expect(getRunnerTag()).toBe('test-runner');
    expect(getBranchName()).toBe('test-branch');
    expect(getLoggingEnabled()).toBe(true);
  });

  it('disables logging when no settings store is configured', () => {
    resetSettingsStore();

    expect(getLoggingEnabled()).toBe(false);
  });
});
