import { setSettingsStore } from 'src/gitlab/digitalTwinConfig/settingsUtility';

const testSettings = {
  GROUP_NAME: 'dtaas',
  DT_DIRECTORY: 'digital_twins',
  COMMON_LIBRARY_PROJECT_NAME: 'common',
  RUNNER_TAG: 'linux',
  BRANCH_NAME: 'main',
  loggingEnabled: false,
  remoteLoggingEnabled: false,
};

setSettingsStore({
  getState: () => ({
    settings: testSettings,
  }),
});
