import LibraryManager, {
  getFilePath,
  FileType,
} from 'preview/util/libraryManager';
import {
  BackendInterface,
  FileState,
} from 'model/backend/gitlab/UtilityInterfaces';
import FileHandler from 'preview/util/fileHandler';
import { mockBackendInstance } from 'test/__mocks__/global_mocks';

jest.mock('preview/util/fileHandler');
jest.mock('model/backend/gitlab/UtilityInterfaces');

describe('LibraryManager', () => {
  let backend: BackendInterface;
  let fileHandler: FileHandler;
  let libraryManager: LibraryManager;

  beforeEach(() => {
    backend = mockBackendInstance;
    fileHandler = new FileHandler('testAsset', backend);
    libraryManager = new LibraryManager('testAsset', backend);
    libraryManager.fileHandler = fileHandler;
  });

  it('should initialize correctly', () => {
    expect(libraryManager.assetName).toBe('testAsset');
    expect(libraryManager.backend).toBe(backend);
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
