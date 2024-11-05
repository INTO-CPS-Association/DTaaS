import FileHandler, { getFilePath } from 'preview/util/fileHandler';
import GitlabInstance from 'preview/util/gitlab';

const mockApi = {
  RepositoryFiles: {
    show: jest.fn().mockResolvedValue({ content: btoa('existing content') }),
    remove: jest.fn(),
    edit: jest.fn(),
    create: jest.fn(),
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

describe('FileHandler', () => {
  let fileHandler: FileHandler;

  beforeEach(() => {
    fileHandler = new FileHandler('DTName', mockGitlabInstance);
  });

  it('should get file path for lifecycle file', () => {
    const file = {
      name: 'fileName',
      content: 'content',
      isNew: true,
      isModified: false,
      type: 'lifecycle',
    };

    const result = getFilePath(file, 'main', 'lifecycle');

    expect(result).toBe('lifecycle');
  });

  it('should create files for lifecycle', async () => {
    const files = [
      {
        name: 'fileName',
        content: 'content',
        isNew: true,
        isModified: false,
        type: 'lifecycle',
      },
    ];

    await fileHandler.createFiles(files, 'main', 'lifecycle');

    expect(mockApi.RepositoryFiles.create).toHaveBeenCalledWith(
      1,
      'lifecycle/fileName',
      'main',
      'content',
      'Add fileName to lifecycle folder',
    );
  });

  it('should append trigger to pipeline', async () => {
    jest
      .spyOn(mockApi.RepositoryFiles, 'show')
      .mockResolvedValue({ content: btoa('existing content') });

    const result = await fileHandler.appendTriggerToPipeline();

    expect(mockApi.RepositoryFiles.edit).toHaveBeenCalledWith(
      mockGitlabInstance.projectId!,
      '.gitlab-ci.yml',
      'main',
      expect.stringContaining('existing content'),
      expect.stringContaining('Add trigger for DTName to .gitlab-ci.yml'),
    );

    expect(result).toBe('Trigger appended to pipeline for DTName');
  });

  it('should remove trigger from pipeline', async () => {
    jest
      .spyOn(mockApi.RepositoryFiles, 'show')
      .mockResolvedValue({ content: btoa('trigger_DTName: existing content') });

    const result = await fileHandler.removeTriggerFromPipeline();

    expect(result).toBe('Trigger removed from pipeline for DTName');
  });

  it('should not remove trigger from pipeline if it does not exist', async () => {
    jest
      .spyOn(mockApi.RepositoryFiles, 'show')
      .mockResolvedValue({ content: btoa('existing content') });

    const result = await fileHandler.removeTriggerFromPipeline();

    expect(result).toBe('No trigger found for DTName in .gitlab-ci.yml');
  });
});
