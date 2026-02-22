/**
 * Mock for the constants getter functions
 * This centralizes all the mocks for the constants module in one place
 * so they can be imported consistently across tests
 */
const DEFAULT_MOCK_VALUES = {
  GROUP_NAME: 'DTaaS',
  DT_DIRECTORY: 'digital_twins',
  COMMON_LIBRARY_PROJECT_NAME: 'common',
  RUNNER_TAG: 'linux',
  BRANCH_NAME: 'master',
};

/**
 * Create a mock for the model/backend/gitlab/settingsUtility module
 * @param overrides - Override specific values from the defaults
 * @returns The mock object that can be used with jest.mock
 */
const createSettingsUtilityMock = (overrides = {}) => {
  const mockValues = { ...DEFAULT_MOCK_VALUES, ...overrides };

  return {
    getGroupName: jest.fn().mockReturnValue(mockValues.GROUP_NAME),
    getDTDirectory: jest.fn().mockReturnValue(mockValues.DT_DIRECTORY),
    getCommonLibraryProjectName: jest
      .fn()
      .mockReturnValue(mockValues.COMMON_LIBRARY_PROJECT_NAME),
    getRunnerTag: jest.fn().mockReturnValue(mockValues.RUNNER_TAG),
    getBranchName: jest.fn().mockReturnValue(mockValues.BRANCH_NAME),
  };
};

/**
 * Create a mock for the constants module
 */
const createConstantsMock = (overrides = {}) => {
  const mockValues = { ...DEFAULT_MOCK_VALUES, ...overrides };

  return {
    GROUP_NAME: mockValues.GROUP_NAME,
    DT_DIRECTORY: mockValues.DT_DIRECTORY,
    COMMON_LIBRARY_PROJECT_NAME: mockValues.COMMON_LIBRARY_PROJECT_NAME,
    RUNNER_TAG: mockValues.RUNNER_TAG,
    BRANCH_NAME: mockValues.BRANCH_NAME,
    MAX_EXECUTION_TIME: 10 * 60 * 1000,
    PIPELINE_POLL_INTERVAL: 5 * 1000,
    AssetTypes: {
      Functions: 'functions',
      Models: 'models',
      Tools: 'tools',
      Data: 'data',
      'Digital Twins': 'digital_twins',
      'Digital Twin': 'digital_twin',
    },
    defaultFiles: [
      { name: 'description.md', type: 'DESCRIPTION' },
      { name: 'README.md', type: 'DESCRIPTION' },
      { name: '.gitlab-ci.yml', type: 'CONFIGURATION' },
    ],
  };
};

export const settingsUtilityMock = createSettingsUtilityMock();
export const constantsMock = createConstantsMock();

export { createSettingsUtilityMock, createConstantsMock };

jest.mock(
  'model/backend/gitlab/digitalTwinConfig/settingsUtility',
  () => settingsUtilityMock,
);
jest.mock(
  'model/backend/gitlab/digitalTwinConfig/constants',
  () => constantsMock,
);
