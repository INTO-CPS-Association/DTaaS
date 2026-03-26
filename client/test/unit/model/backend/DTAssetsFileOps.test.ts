import { FileType } from 'model/backend/interfaces/sharedInterfaces';
import DTAssets from 'model/backend/DTAssets';
import {
  mockBackendInstance,
  mockFileHandler,
} from 'test/__mocks__/global_mocks';

jest.mock('model/backend/fileHandler', () => ({
  default: jest.fn().mockImplementation(() => mockFileHandler),
}));

describe('DTAssets - File Operations', () => {
  let dtAssets: DTAssets;
  const dtName = 'DTName';

  beforeEach(() => {
    dtAssets = new DTAssets(dtName, mockBackendInstance);
    dtAssets.fileHandler = mockFileHandler;
  });

  describe('getFilesFromAsset', () => {
    it('should fetch files from asset and return them', async () => {
      dtAssets.fileHandler.getLibraryFileNames = jest
        .fn()
        .mockResolvedValue(['file1.json', 'file2.yml']);
      dtAssets.fileHandler.getFileContent = jest
        .fn()
        .mockResolvedValueOnce('content1')
        .mockResolvedValueOnce('content2');

      const result = await dtAssets.getFilesFromAsset('assets/myAsset', true);

      expect(result).toEqual([
        {
          name: 'file1.json',
          content: 'content1',
          path: 'assets/myAsset',
          isPrivate: true,
        },
        {
          name: 'file2.yml',
          content: 'content2',
          path: 'assets/myAsset',
          isPrivate: true,
        },
      ]);
      expect(dtAssets.fileHandler.getLibraryFileNames).toHaveBeenCalledWith(
        'assets/myAsset',
        true,
      );
      expect(dtAssets.fileHandler.getFileContent).toHaveBeenCalledWith(
        'assets/myAsset/file1.json',
        true,
      );
    });

    it('should throw error when fetching files fails', async () => {
      dtAssets.fileHandler.getLibraryFileNames = jest
        .fn()
        .mockRejectedValue(new Error('Network error'));

      await expect(
        dtAssets.getFilesFromAsset('assets/myAsset', false),
      ).rejects.toThrow('Error fetching files from asset at assets/myAsset');
    });
  });

  describe('updateLibraryFileContent', () => {
    it('should update library file content', async () => {
      dtAssets.fileHandler.updateFile = jest.fn().mockResolvedValue(undefined);
      const assetPath = 'common/digital_twins/myAsset';

      await dtAssets.updateLibraryFileContent(
        'config.json',
        'new content',
        assetPath,
      );

      expect(dtAssets.fileHandler.updateFile).toHaveBeenCalledWith(
        `${assetPath}/config.json`,
        'new content',
        'Update config.json content',
      );
    });
  });

  describe('getFileContent', () => {
    it('should get file content from digital twin folder for file with extension', async () => {
      dtAssets.fileHandler.getFileContent = jest
        .fn()
        .mockResolvedValue('file content');

      const result = await dtAssets.getFileContent('config.json');

      expect(dtAssets.fileHandler.getFileContent).toHaveBeenCalledWith(
        `digital_twins/${dtName}/config.json`,
      );
      expect(result).toBe('file content');
    });

    it('should get file content from lifecycle folder for file without extension', async () => {
      dtAssets.fileHandler.getFileContent = jest
        .fn()
        .mockResolvedValue('lifecycle content');

      const result = await dtAssets.getFileContent('create');

      expect(dtAssets.fileHandler.getFileContent).toHaveBeenCalledWith(
        `digital_twins/${dtName}/lifecycle/create`,
      );
      expect(result).toBe('lifecycle content');
    });
  });

  describe('getLibraryFileContent', () => {
    it('should get library file content', async () => {
      dtAssets.fileHandler.getFileContent = jest
        .fn()
        .mockResolvedValue('library content');

      const result = await dtAssets.getLibraryFileContent(
        'common/assets/myAsset',
        'data.json',
      );

      expect(dtAssets.fileHandler.getFileContent).toHaveBeenCalledWith(
        'common/assets/myAsset/data.json',
      );
      expect(result).toBe('library content');
    });
  });

  describe('getFileNames', () => {
    it('should get file names by type', async () => {
      dtAssets.fileHandler.getFileNames = jest
        .fn()
        .mockResolvedValue(['file1.json', 'file2.yml']);

      const result = await dtAssets.getFileNames(FileType.CONFIGURATION);

      expect(dtAssets.fileHandler.getFileNames).toHaveBeenCalledWith(
        FileType.CONFIGURATION,
      );
      expect(result).toEqual(['file1.json', 'file2.yml']);
    });
  });

  describe('getLibraryConfigFileNames', () => {
    it('should get library config file names', async () => {
      dtAssets.fileHandler.getLibraryConfigFileNames = jest
        .fn()
        .mockResolvedValue(['config.json', 'settings.yml']);

      const result = await dtAssets.getLibraryConfigFileNames(
        'common/digital_twins/myDT',
      );

      expect(
        dtAssets.fileHandler.getLibraryConfigFileNames,
      ).toHaveBeenCalledWith('common/digital_twins/myDT', true);
      expect(result).toEqual(['config.json', 'settings.yml']);
    });
  });

  describe('getFolders', () => {
    it('should get folders', async () => {
      dtAssets.fileHandler.getFolders = jest
        .fn()
        .mockResolvedValue(['folder1', 'folder2']);

      const result = await dtAssets.getFolders('digital_twins/myDT');

      expect(dtAssets.fileHandler.getFolders).toHaveBeenCalledWith(
        'digital_twins/myDT',
      );
      expect(result).toEqual(['folder1', 'folder2']);
    });
  });
});
