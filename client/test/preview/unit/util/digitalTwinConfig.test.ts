import GitlabInstance from 'model/backend/gitlab/interfaces';
import DigitalTwin from 'preview/util/digitalTwin';

const mockApi = {
  RepositoryFiles: {
    show: jest.fn(),
    remove: jest.fn(),
    edit: jest.fn(),
  },
  Repositories: {
    allRepositoryTrees: jest.fn(),
  },
  PipelineTriggerTokens: {
    trigger: jest.fn(),
  },
  Pipelines: {
    cancel: jest.fn(),
  },
};

const mockGitlabInstance = {
  api: mockApi as unknown as GitlabInstance['api'],
  projectId: 1,
  triggerToken: 'test-token',
  logs: [] as { jobName: string; log: string }[],
  getProjectId: jest.fn(),
  getTriggerToken: jest.fn(),
} as unknown as GitlabInstance;

describe('DigitalTwin', () => {
  let dt: DigitalTwin;

  const mockResponse = [
    { type: 'blob', name: 'file1.md', path: 'test-path' },
    { type: 'blob', name: 'file2.json', path: 'test-path' },
    { type: 'blob', name: 'file3', path: '/lifecycle/test-path' },
    { type: 'tree', name: 'folder', path: 'test-path' },
  ];

  const mockFetchFilesError = async (
    errorMessage: string,
    fetchMethod: () => Promise<void>,
    resultArray: string[],
  ) => {
    (mockApi.Repositories.allRepositoryTrees as jest.Mock).mockRejectedValue(
      new Error(errorMessage),
    );
    await fetchMethod();
    expect(resultArray).toEqual([]);
  };

  const expectAllRepositoryTreesCalled = (
    recursive: boolean,
    lifecycle?: boolean,
  ) => {
    const path = lifecycle
      ? 'digital_twins/test-DTName/lifecycle'
      : 'digital_twins/test-DTName';

    expect(mockApi.Repositories.allRepositoryTrees).toHaveBeenCalledWith(1, {
      path,
      recursive,
    });
  };

  beforeEach(() => {
    mockGitlabInstance.projectId = 1;
    dt = new DigitalTwin('test-DTName', mockGitlabInstance);

    (mockApi.Repositories.allRepositoryTrees as jest.Mock).mockResolvedValue(
      mockResponse,
    );
  });

  it('should get description files', async () => {
    await dt.getDescriptionFiles();

    expectAllRepositoryTreesCalled(false);

    expect(dt.descriptionFiles).toEqual(['file1.md']);
  });

  it('should return empty array when fetching description files fails', async () => {
    await mockFetchFilesError(
      'Error fetching description files',
      dt.getDescriptionFiles.bind(dt),
      dt.descriptionFiles,
    );
  });

  it('should get lifecycle files', async () => {
    await dt.getLifecycleFiles();

    expectAllRepositoryTreesCalled(true, true);

    expect(dt.lifecycleFiles).toEqual(['file3']);
  });

  it('should return empty array when fetching lifecycle files fails', async () => {
    await mockFetchFilesError(
      'Error fetching lifecycle files',
      dt.getLifecycleFiles.bind(dt),
      dt.lifecycleFiles,
    );
  });

  it('should get config files', async () => {
    await dt.getConfigFiles();

    expectAllRepositoryTreesCalled(false);

    expect(dt.configFiles).toEqual(['file2.json']);
  });

  it('should return empty array when fetching config files fails', async () => {
    await mockFetchFilesError(
      'Error fetching config files',
      dt.getConfigFiles.bind(dt),
      dt.configFiles,
    );
  });

  it('should get file content for a file with an extension', async () => {
    const mockContent = btoa('Test file content');
    (mockApi.RepositoryFiles.show as jest.Mock).mockResolvedValue({
      content: mockContent,
    });

    const content = await dt.DTAssets.getFileContent('test-file.md');

    expect(content).toBe('Test file content');
    expect(mockApi.RepositoryFiles.show).toHaveBeenCalledWith(
      1,
      'digital_twins/test-DTName/test-file.md',
      'main',
    );
  });

  it('should get file content for a file without an extension (lifecycle folder)', async () => {
    const mockContent = btoa('Test lifecycle content');
    (mockApi.RepositoryFiles.show as jest.Mock).mockResolvedValue({
      content: mockContent,
    });

    const content = await dt.DTAssets.getFileContent('lifecycle-file');

    expect(content).toBe('Test lifecycle content');
    expect(mockApi.RepositoryFiles.show).toHaveBeenCalledWith(
      1,
      'digital_twins/test-DTName/lifecycle/lifecycle-file',
      'main',
    );
  });

  it('should update file content for a file with an extension', async () => {
    const mockEdit = jest.fn();
    mockApi.RepositoryFiles.edit = mockEdit;

    await dt.DTAssets.updateFileContent('test-file.md', 'Test file content');

    expect(mockApi.RepositoryFiles.edit).toHaveBeenCalledWith(
      1,
      'digital_twins/test-DTName/test-file.md',
      'main',
      'Test file content',
      'Update test-file.md content',
    );
  });

  it('should update file content for a file without an extension (lifecycle folder)', async () => {
    const mockEdit = jest.fn();
    mockApi.RepositoryFiles.edit = mockEdit;

    await dt.DTAssets.updateFileContent(
      'lifecycle-file',
      'Lifecycle file content',
    );

    expect(mockApi.RepositoryFiles.edit).toHaveBeenCalledWith(
      1,
      'digital_twins/test-DTName/lifecycle/lifecycle-file',
      'main',
      'Lifecycle file content',
      'Update lifecycle-file content',
    );
  });
});
