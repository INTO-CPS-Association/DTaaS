import { FileType } from 'model/backend/gitlab/constants';
import FileHandler from 'preview/util/fileHandler';
import GitlabInstance from 'model/backend/gitlab/instance';
import { mockBackendAPI } from 'test/__mocks__/global_mocks';

const mockApi = mockBackendAPI;

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
    expect(mockApi.createRepositoryFile).toHaveBeenCalledWith(
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
    expect(mockApi.createRepositoryFile).toHaveBeenCalledWith(
      2,
      'path/file',
      'main',
      'content',
      'commit message',
    );
  });

  it('should update a file', async () => {
    await fileHandler.updateFile('path', 'updated content', 'commit message');
    expect(mockApi.editRepositoryFile).toHaveBeenCalledWith(
      1,
      'path',
      'main',
      'updated content',
      'commit message',
    );
  });

  it('should delete a file', async () => {
    await fileHandler.deleteDT('path');
    expect(mockApi.removeRepositoryFile).toHaveBeenCalledWith(
      1,
      'path',
      'main',
      'Removing DTName digital twin',
    );
  });

  it('should get file content', async () => {
    jest
      .spyOn(mockApi, 'getRepositoryFileContent')
      .mockResolvedValue({ content: 'existing content' });
    const content = await fileHandler.getFileContent('path');
    expect(content).toBe('existing content');
    expect(mockApi.getRepositoryFileContent).toHaveBeenCalledWith(
      1,
      'path',
      'main',
    );
  });

  it('should get file content from common project', async () => {
    jest
      .spyOn(mockApi, 'getRepositoryFileContent')
      .mockResolvedValue({ content: 'existing content' });
    const content = await fileHandler.getFileContent('path', false);
    expect(content).toBe('existing content');
    expect(mockApi.getRepositoryFileContent).toHaveBeenCalledWith(
      2,
      'path',
      'main',
    );
  });

  it('should get file names', async () => {
    (mockApi.listRepositoryFiles as jest.Mock).mockResolvedValue([
      { type: 'blob', name: 'file1.md', path: 'digital_twins/DTName/file1.md' },
      { type: 'blob', name: 'file2.md', path: 'digital_twins/DTName/file2.md' },
    ]);

    const fileNames = await fileHandler.getFileNames(FileType.DESCRIPTION);
    expect(fileNames).toEqual(['file1.md', 'file2.md']);
    expect(mockApi.listRepositoryFiles).toHaveBeenCalledWith(
      1,
      'digital_twins/DTName',
      undefined,
      false,
    );
  });

  it('should get public library file names', async () => {
    const filePath = 'functions/Functions2';
    (mockApi.listRepositoryFiles as jest.Mock).mockResolvedValue([
      {
        type: 'blob',
        name: 'function.py',
        path: 'functions/Function1/function.py',
      },
      { type: 'blob', name: 'README.md', path: 'models/Function1/README.md' },
    ]);

    const fileNames = await fileHandler.getLibraryFileNames(filePath, false);
    expect(fileNames).toEqual(['function.py', 'README.md']);
    expect(mockApi.listRepositoryFiles).toHaveBeenCalledWith(
      2,
      filePath,
      undefined,
      false,
    );
  });

  it('should get private library file names', async () => {
    const filePath = 'functions/Functions2';
    (mockApi.listRepositoryFiles as jest.Mock).mockResolvedValue([
      {
        type: 'blob',
        name: 'function.py',
        path: 'functions/Function2/function.py',
      },
      { type: 'blob', name: 'README.md', path: 'models/Function2/README.md' },
    ]);

    const fileNames = await fileHandler.getLibraryFileNames(filePath, true);
    expect(fileNames).toEqual(['function.py', 'README.md']);
    expect(mockApi.listRepositoryFiles).toHaveBeenCalledWith(
      1,
      filePath,
      undefined,
      false,
    );
  });

  it('should get Library config file names', async () => {
    const filePath = 'common/functions/Functions2';
    (mockApi.listRepositoryFiles as jest.Mock).mockResolvedValue([
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
    expect(fileHandler.backend.getCommonProjectId).toHaveBeenCalled();
    expect(mockApi.listRepositoryFiles).toHaveBeenCalledWith(
      2,
      filePath,
      undefined,
      true,
    );
    expect(fileNames).toEqual(['config1.json', 'foo.yml']);
  });

  it('should get private Library config file names', async () => {
    const filePath = 'common/functions/Functions3';
    (mockApi.listRepositoryFiles as jest.Mock).mockResolvedValue([
      {
        type: 'blob',
        name: 'privateConfig.json',
        path: 'common/functions/Functions3/privateConfig.json',
      },
    ]);
    const fileNames = await fileHandler.getLibraryConfigFileNames(
      filePath,
      true,
    );
    expect(fileHandler.backend.getProjectId).toHaveBeenCalled();
    expect(mockApi.listRepositoryFiles).toHaveBeenCalledWith(
      1,
      filePath,
      undefined,
      true,
    );
    expect(fileNames).toEqual(['privateConfig.json']);
  });
});
