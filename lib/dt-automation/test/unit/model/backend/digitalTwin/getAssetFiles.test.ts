import DigitalTwin from 'model/backend/digitalTwin';
import {
  mockGitlabInstance,
  setupBeforeEach,
  createDigitalTwin,
} from './testSetup';

describe('DigitalTwin - getAssetFiles', () => {
  let dt: DigitalTwin;

  beforeEach(() => {
    dt = createDigitalTwin();
    setupBeforeEach(dt);
    jest.spyOn(dt.DTAssets, 'getFolders').mockImplementation();
    jest.spyOn(dt.DTAssets, 'getLibraryConfigFileNames').mockImplementation();
  });

  afterEach(() => {
    mockGitlabInstance.getProjectId = jest.fn().mockReturnValue(1);
  });

  it('should get asset files with common subfolder structure', async () => {
    const mockFolders = ['folder1', 'folder2/common', 'folder3'];
    const mockSubFolders = ['folder2/common/sub1', 'folder2/common/sub2'];
    const mockFileNames = ['file1.json', 'file2.json'];

    jest
      .spyOn(dt.DTAssets, 'getFolders')
      .mockResolvedValueOnce(mockFolders)
      .mockResolvedValueOnce(mockSubFolders);

    jest
      .spyOn(dt.DTAssets, 'getLibraryConfigFileNames')
      .mockResolvedValue(mockFileNames);

    const result = await dt.getAssetFiles();

    expect(dt.DTAssets.getFolders).toHaveBeenCalledWith(
      'digital_twins/test-DTName',
    );
    expect(dt.DTAssets.getFolders).toHaveBeenCalledWith('folder2/common');
    expect(dt.DTAssets.getLibraryConfigFileNames).toHaveBeenCalledWith(
      'folder1',
    );
    expect(dt.DTAssets.getLibraryConfigFileNames).toHaveBeenCalledWith(
      'folder2/common/sub1',
    );
    expect(dt.DTAssets.getLibraryConfigFileNames).toHaveBeenCalledWith(
      'folder2/common/sub2',
    );
    expect(dt.DTAssets.getLibraryConfigFileNames).toHaveBeenCalledWith(
      'folder3',
    );
    expect(result).toEqual([
      { assetPath: 'folder1', fileNames: mockFileNames },
      { assetPath: 'folder2/common/sub1', fileNames: mockFileNames },
      { assetPath: 'folder2/common/sub2', fileNames: mockFileNames },
      { assetPath: 'folder3', fileNames: mockFileNames },
    ]);
    expect(dt.assetFiles).toEqual(result);
  });

  it('should get asset files without common subfolders', async () => {
    const mockFolders = ['folder1', 'folder2', 'folder3'];
    const mockFileNames = ['config1.json', 'config2.json'];

    jest.spyOn(dt.DTAssets, 'getFolders').mockResolvedValue(mockFolders);
    jest
      .spyOn(dt.DTAssets, 'getLibraryConfigFileNames')
      .mockResolvedValue(mockFileNames);

    const result = await dt.getAssetFiles();

    expect(result).toEqual([
      { assetPath: 'folder1', fileNames: mockFileNames },
      { assetPath: 'folder2', fileNames: mockFileNames },
      { assetPath: 'folder3', fileNames: mockFileNames },
    ]);
  });

  it('should filter out lifecycle folders', async () => {
    const mockFolders = [
      'folder1',
      'lifecycle',
      'folder2/lifecycle',
      'folder3',
    ];
    const mockFileNames = ['file1.json'];

    jest.spyOn(dt.DTAssets, 'getFolders').mockResolvedValue(mockFolders);
    jest
      .spyOn(dt.DTAssets, 'getLibraryConfigFileNames')
      .mockResolvedValue(mockFileNames);

    const result = await dt.getAssetFiles();

    expect(dt.DTAssets.getLibraryConfigFileNames).not.toHaveBeenCalledWith(
      'lifecycle',
    );
    expect(dt.DTAssets.getLibraryConfigFileNames).not.toHaveBeenCalledWith(
      'folder2/lifecycle',
    );
    expect(result).toEqual([
      { assetPath: 'folder1', fileNames: mockFileNames },
      { assetPath: 'folder3', fileNames: mockFileNames },
    ]);
  });

  it('should return empty array when getFolders fails', async () => {
    jest
      .spyOn(dt.DTAssets, 'getFolders')
      .mockRejectedValue(new Error('Folder access failed'));

    const result = await dt.getAssetFiles();

    expect(result).toEqual([]);
    expect(dt.assetFiles).toEqual([]);
  });

  it('should handle getLibraryConfigFileNames errors gracefully', async () => {
    const mockFolders = ['folder1', 'folder2'];
    jest.spyOn(dt.DTAssets, 'getFolders').mockResolvedValue(mockFolders);
    jest
      .spyOn(dt.DTAssets, 'getLibraryConfigFileNames')
      .mockRejectedValue(new Error('File access failed'));

    const result = await dt.getAssetFiles();

    expect(result).toEqual([]);
  });
});
