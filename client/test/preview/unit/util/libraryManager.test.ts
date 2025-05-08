import LibraryManager, {
  getFilePath,
  FileType,
} from 'preview/util/libraryManager';
import { BackendInterface, FileState } from 'model/backend/gitlab/interfaces';
import FileHandler from 'preview/util/fileHandler';
import { mockGitlabInstance } from 'test/preview/__mocks__/global_mocks';

jest.mock('preview/util/fileHandler');
jest.mock('model/backend/gitlab/interfaces');

describe('LibraryManager', () => {
  let gitlabInstance: BackendInterface;
  let fileHandler: FileHandler;
  let libraryManager: LibraryManager;

  beforeEach(() => {
    gitlabInstance = mockGitlabInstance;
    fileHandler = new FileHandler('testAsset', gitlabInstance);
    libraryManager = new LibraryManager('testAsset', gitlabInstance);
    libraryManager.fileHandler = fileHandler;
  });

  it('should initialize correctly', () => {
    expect(libraryManager.assetName).toBe('testAsset');
    expect(libraryManager.gitlabInstance).toBe(gitlabInstance);
    expect(libraryManager.fileHandler).toBe(fileHandler);
  });

  it('should get file content', async () => {
    const fileContent = 'file content';
    fileHandler.getFileContent = jest.fn().mockResolvedValue(fileContent);

    const result = await libraryManager.getFileContent(
      true,
      'path/to/file',
      'file.txt',
    );
    expect(result).toBe(fileContent);
    expect(fileHandler.getFileContent).toHaveBeenCalledWith(
      'path/to/file/file.txt',
      true,
    );
  });

  it('should get file names', async () => {
    const fileNames = ['file1', 'file2'];
    fileHandler.getLibraryConfigFileNames = jest
      .fn()
      .mockResolvedValue(fileNames);

    const result = await libraryManager.getFileNames(true, 'path/to/files');
    expect(result).toEqual(fileNames);
    expect(fileHandler.getLibraryConfigFileNames).toHaveBeenCalledWith(
      'path/to/files',
      true,
    );
  });
});

describe('getFilePath', () => {
  it('should return lifecycle folder path for lifecycle file type', () => {
    const file: FileState = { type: FileType.LIFECYCLE } as FileState;
    const result = getFilePath(file, 'main/path', 'lifecycle/path');
    expect(result).toBe('lifecycle/path');
  });

  it('should return main folder path for non-lifecycle file type', () => {
    const file: FileState = { type: FileType.DESCRIPTION } as FileState;
    const result = getFilePath(file, 'main/path', 'lifecycle/path');
    expect(result).toBe('main/path');
  });
});
