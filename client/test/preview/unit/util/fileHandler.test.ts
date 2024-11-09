import { FileType } from 'preview/util/DTAssets';
import FileHandler from 'preview/util/fileHandler';
import GitlabInstance from 'preview/util/gitlab';

const mockApi = {
  RepositoryFiles: {
    show: jest.fn(),
    edit: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
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

  it('should create a file', async () => {
    const fileState = {
      name: 'file',
      content: 'content',
      isNew: true,
      isModified: false,
    };
    await fileHandler.createFile(fileState, 'path', 'commit message');
    expect(mockApi.RepositoryFiles.create).toHaveBeenCalledWith(
      1,
      'path/file',
      'main',
      'content',
      'commit message',
    );
  });

  it('should update a file', async () => {
    await fileHandler.updateFile('path', 'updated content', 'commit message');
    expect(mockApi.RepositoryFiles.edit).toHaveBeenCalledWith(
      1,
      'path',
      'main',
      'updated content',
      'commit message',
    );
  });

  it('should delete a file', async () => {
    await fileHandler.deleteDT('path');
    expect(mockApi.RepositoryFiles.remove).toHaveBeenCalledWith(
      1,
      'path',
      'main',
      'Removing DTName digital twin',
    );
  });

  it('should get file content', async () => {
    jest
      .spyOn(mockApi.RepositoryFiles, 'show')
      .mockResolvedValue({ content: btoa('existing content') });
    const content = await fileHandler.getFileContent('path');
    expect(content).toBe('existing content');
    expect(mockApi.RepositoryFiles.show).toHaveBeenCalledWith(
      1,
      'path',
      'main',
    );
  });

  it('should get file names', async () => {
    mockApi.Repositories.allRepositoryTrees.mockResolvedValue([
      { type: 'blob', name: 'file1.md', path: 'digital_twins/DTName/file1.md' },
      { type: 'blob', name: 'file2.md', path: 'digital_twins/DTName/file2.md' },
    ]);

    const fileNames = await fileHandler.getFileNames(FileType.DESCRIPTION);
    expect(fileNames).toEqual(['file1.md', 'file2.md']);
    expect(mockApi.Repositories.allRepositoryTrees).toHaveBeenCalledWith(1, {
      path: 'digital_twins/DTName',
      recursive: false,
    });
  });
});
