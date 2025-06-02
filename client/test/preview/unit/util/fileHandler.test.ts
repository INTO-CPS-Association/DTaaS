import { FileType } from 'model/backend/gitlab/constants';
import FileHandler from 'preview/util/fileHandler';
import GitlabInstance from 'model/backend/gitlab/gitlab';

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
  triggerToken: 'test-token',
  logs: [] as { jobName: string; log: string }[],
  getProjectId: jest.fn().mockReturnValue(1),
  getCommonProjectId: jest.fn().mockReturnValue(2),
  getTriggerToken: jest.fn(),
} as unknown as GitlabInstance;

describe('FileHandler', () => {
  let fileHandler: FileHandler;

  beforeEach(() => {
    mockGitlabInstance.getProjectId = jest.fn().mockReturnValue(1);
    mockGitlabInstance.getCommonProjectId = jest.fn().mockReturnValue(2);
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

  it('should create a common project file', async () => {
    const fileState = {
      name: 'file',
      content: 'content',
      isNew: true,
      isModified: false,
    };
    await fileHandler.createFile(fileState, 'path', 'commit message', true);
    expect(mockApi.RepositoryFiles.create).toHaveBeenCalledWith(
      2,
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

  it('should get file content from common project', async () => {
    jest
      .spyOn(mockApi.RepositoryFiles, 'show')
      .mockResolvedValue({ content: btoa('existing content') });
    const content = await fileHandler.getFileContent('path', false);
    expect(content).toBe('existing content');
    expect(mockApi.RepositoryFiles.show).toHaveBeenCalledWith(
      2,
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

  it('should get public library file names', async () => {
    const filePath = 'functions/Functions2';
    mockApi.Repositories.allRepositoryTrees.mockResolvedValue([
      {
        type: 'blob',
        name: 'function.py',
        path: 'functions/Function1/function.py',
      },
      { type: 'blob', name: 'README.md', path: 'models/Function1/README.md' },
    ]);

    const fileNames = await fileHandler.getLibraryFileNames(filePath, false);
    expect(fileNames).toEqual(['function.py', 'README.md']);
    expect(mockApi.Repositories.allRepositoryTrees).toHaveBeenCalledWith(2, {
      path: filePath,
      recursive: false,
    });
  });

  it('should get private library file names', async () => {
    const filePath = 'functions/Functions2';
    mockApi.Repositories.allRepositoryTrees.mockResolvedValue([
      {
        type: 'blob',
        name: 'function.py',
        path: 'functions/Function2/function.py',
      },
      { type: 'blob', name: 'README.md', path: 'models/Function2/README.md' },
    ]);

    const fileNames = await fileHandler.getLibraryFileNames(filePath, true);
    expect(fileNames).toEqual(['function.py', 'README.md']);
    expect(mockApi.Repositories.allRepositoryTrees).toHaveBeenCalledWith(1, {
      path: filePath,
      recursive: false,
    });
  });

  it('should get Library config file names', async () => {
    const filePath = 'common/functions/Functions2';
    mockApi.Repositories.allRepositoryTrees.mockResolvedValue([
      {
        type: 'blob',
        name: 'config1.json',
        path: 'common/functions/Functions2/config1.json',
      },
      {
        type: 'blob',
        name: 'foo.yml',
        path: 'common/functions/Functions2/foo.yml',
      },
    ]);
    const fileNames = await fileHandler.getLibraryConfigFileNames(
      filePath,
      false,
    );
    expect(mockApi.Repositories.allRepositoryTrees).toHaveBeenCalledWith(2, {
      path: filePath,
      recursive: true,
    });
    expect(fileNames).toEqual(['config1.json', 'foo.yml']);
  });
});
