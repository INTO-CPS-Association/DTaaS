import LibraryAsset from 'preview/util/libraryAsset';
import GitlabInstance from 'preview/util/gitlab';
import LibraryManager from 'preview/util/libraryManager';
import { mockGitlabInstance } from 'test/preview/__mocks__/global_mocks';

jest.mock('preview/util/libraryManager');
jest.mock('preview/util/gitlab');

describe('LibraryAsset', () => {
  let gitlabInstance: GitlabInstance;
  let libraryManager: LibraryManager;
  let libraryAsset: LibraryAsset;

  beforeEach(() => {
    gitlabInstance = mockGitlabInstance;
    libraryManager = new LibraryManager('test', gitlabInstance);
    libraryAsset = new LibraryAsset(
      'test',
      'path/to/library',
      true,
      'type',
      gitlabInstance,
    );
    libraryAsset.libraryManager = libraryManager;
  });

  it('should initialize correctly', () => {
    expect(libraryAsset.name).toBe('test');
    expect(libraryAsset.path).toBe('path/to/library');
    expect(libraryAsset.isPrivate).toBe(true);
    expect(libraryAsset.type).toBe('type');
    expect(libraryAsset.gitlabInstance).toBe(gitlabInstance);
    expect(libraryAsset.libraryManager).toBe(libraryManager);
  });

  it('should get description', async () => {
    libraryManager.getFileContent = jest.fn().mockResolvedValue('File content');
    await libraryAsset.getDescription();
    expect(libraryAsset.description).toBe('File content');
  });

  it('should handle error when getting description', async () => {
    libraryManager.getFileContent = jest
      .fn()
      .mockRejectedValue(new Error('Error'));
    await libraryAsset.getDescription();
    expect(libraryAsset.description).toBe('There is no description.md file');
  });

  it('should get full description with image URLs replaced', async () => {
    const fileContent = '![alt text](image.png)';
    libraryManager.getFileContent = jest.fn().mockResolvedValue(fileContent);
    sessionStorage.setItem('username', 'user');
    await libraryAsset.getFullDescription();
    expect(libraryAsset.fullDescription).toBe(
      '![alt text](https://example.com/AUTHORITY/dtaas/user/-/raw/main/path/to/library/image.png)',
    );
  });

  it('should handle error when getting full description', async () => {
    libraryManager.getFileContent = jest
      .fn()
      .mockRejectedValue(new Error('Error'));
    await libraryAsset.getFullDescription();
    expect(libraryAsset.fullDescription).toBe('There is no README.md file');
  });

  it('should get config files', async () => {
    const fileNames = ['file1', 'file2'];
    libraryManager.getFileNames = jest.fn().mockResolvedValue(fileNames);
    await libraryAsset.getConfigFiles();
    expect(libraryAsset.configFiles).toEqual(fileNames);
  });
});
