export const ADAPTER_MOCKS = {
  createDigitalTwinFromData: jest
    .fn()
    .mockImplementation(async (digitalTwinData, name) => ({
      DTName: name || 'Asset 1',
      delete: jest.fn().mockResolvedValue('Deleted successfully'),
      execute: jest.fn().mockResolvedValue(123),
      stop: jest.fn().mockResolvedValue(undefined),
      getFullDescription: jest
        .fn()
        .mockResolvedValue('Test Digital Twin Description'),
      reconfigure: jest.fn().mockResolvedValue(undefined),
      getDescriptionFiles: jest
        .fn()
        .mockResolvedValue(['file1.md', 'file2.md']),
      getConfigFiles: jest
        .fn()
        .mockResolvedValue(['config1.json', 'config2.json']),
      getLifecycleFiles: jest
        .fn()
        .mockResolvedValue(['lifecycle1.txt', 'lifecycle2.txt']),
      DTAssets: {
        getFileContent: jest.fn().mockResolvedValue('mock file content'),
        updateFileContent: jest.fn().mockResolvedValue(undefined),
        updateLibraryFileContent: jest.fn().mockResolvedValue(undefined),
      },
      descriptionFiles: ['file1.md', 'file2.md'],
      configFiles: ['config1.json', 'config2.json'],
      lifecycleFiles: ['lifecycle1.txt', 'lifecycle2.txt'],
      gitlabInstance: {
        init: jest.fn().mockResolvedValue(undefined),
        getProjectId: jest.fn().mockResolvedValue(123),
        projectId: 123,
      },
    })),
  extractDataFromDigitalTwin: jest.fn().mockReturnValue({
    DTName: 'Asset 1',
    description: 'Test Digital Twin Description',
    jobLogs: [],
    pipelineCompleted: false,
    pipelineLoading: false,
    pipelineId: undefined,
    currentExecutionId: undefined,
    lastExecutionStatus: undefined,
    gitlabProjectId: 123,
  }),
};

export const INIT_MOCKS = {
  initDigitalTwin: jest.fn().mockResolvedValue({
    DTName: 'Asset 1',
    delete: jest.fn().mockResolvedValue('Deleted successfully'),
    execute: jest.fn().mockResolvedValue(123),
    stop: jest.fn().mockResolvedValue(undefined),
    getFullDescription: jest
      .fn()
      .mockResolvedValue('Test Digital Twin Description'),
    reconfigure: jest.fn().mockResolvedValue(undefined),
    gitlabInstance: {
      init: jest.fn().mockResolvedValue(undefined),
      getProjectId: jest.fn().mockResolvedValue(123),
      projectId: 123,
    },
  }),
  fetchLibraryAssets: jest.fn(),
  fetchDigitalTwins: jest.fn(),
};

export const GITLAB_MOCKS = {
  GitlabInstance: jest.fn().mockImplementation(() => ({
    init: jest.fn().mockResolvedValue(undefined),
    getProjectId: jest.fn().mockResolvedValue(123),
    show: jest.fn().mockResolvedValue({}),
    projectId: 123,
    getPipelineStatus: jest.fn().mockResolvedValue('success'),
    getPipelineJobs: jest.fn().mockResolvedValue([]),
    getJobTrace: jest.fn().mockResolvedValue('mock job trace'),
  })),
};
