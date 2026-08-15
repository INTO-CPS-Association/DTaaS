import DigitalTwin from 'model/backend/digitalTwin';
import { LibraryAssetInterface } from 'model/backend/interfaces/sharedInterfaces';
import {
  getAssetFilesFn,
  prepareAllAssetFilesFn,
} from 'model/backend/util/digitalTwinFileManagement';
import { mockBackendInstance, mockDTAssets } from 'test/__mocks__/global_mocks';

jest.mock('model/backend/util/digitalTwinUtils', () => ({
  ...jest.requireActual('model/backend/util/digitalTwinUtils'),
  getUpdatedLibraryFile: jest.fn(),
}));

describe('digitalTwinFileManagement - Asset Files', () => {
  let mockDT: DigitalTwin;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDT = {
      DTName: 'testDT',
      backend: {
        ...mockBackendInstance,
        getProjectId: jest.fn().mockReturnValue(1),
        api: {
          ...mockBackendInstance.api,
          commitMultipleActions: jest.fn().mockResolvedValue(undefined),
        },
      },
      DTAssets: {
        ...mockDTAssets,
        buildCreateFileActions: jest.fn().mockReturnValue([]),
        buildTriggerAction: jest.fn().mockResolvedValue(null),
        getFilesFromAsset: jest.fn().mockResolvedValue([]),
        getFolders: jest.fn().mockResolvedValue([]),
        getLibraryConfigFileNames: jest.fn().mockResolvedValue([]),
      },
      assetFiles: [],
    } as unknown as DigitalTwin;
  });

  describe('getAssetFilesFn', () => {
    it('should return asset files from non-lifecycle folders', async () => {
      (mockDT.DTAssets.getFolders as jest.Mock).mockResolvedValue([
        'digital_twins/testDT/config',
      ]);
      (
        mockDT.DTAssets.getLibraryConfigFileNames as jest.Mock
      ).mockResolvedValue(['file1.json']);

      const result = await getAssetFilesFn(mockDT);

      expect(result).toEqual([
        { assetPath: 'digital_twins/testDT/config', fileNames: ['file1.json'] },
      ]);
      expect(mockDT.assetFiles).toEqual(result);
    });

    it('should exclude lifecycle folders', async () => {
      (mockDT.DTAssets.getFolders as jest.Mock).mockResolvedValue([
        'digital_twins/testDT/lifecycle',
        'digital_twins/testDT/config',
      ]);
      (
        mockDT.DTAssets.getLibraryConfigFileNames as jest.Mock
      ).mockResolvedValue(['file1.json']);

      const result = await getAssetFilesFn(mockDT);

      expect(result).toEqual([
        { assetPath: 'digital_twins/testDT/config', fileNames: ['file1.json'] },
      ]);
    });

    it('should process common subfolders', async () => {
      (mockDT.DTAssets.getFolders as jest.Mock)
        .mockResolvedValueOnce(['digital_twins/testDT/common'])
        .mockResolvedValueOnce(['digital_twins/testDT/common/sub1']);
      (
        mockDT.DTAssets.getLibraryConfigFileNames as jest.Mock
      ).mockResolvedValue(['config.yml']);

      const result = await getAssetFilesFn(mockDT);

      expect(result).toEqual([
        {
          assetPath: 'digital_twins/testDT/common/sub1',
          fileNames: ['config.yml'],
        },
      ]);
    });

    it('should return empty array when getFolders throws', async () => {
      (mockDT.DTAssets.getFolders as jest.Mock).mockRejectedValue(
        new Error('Not found'),
      );

      const result = await getAssetFilesFn(mockDT);

      expect(result).toEqual([]);
    });
  });

  describe('prepareAllAssetFilesFn', () => {
    it('should prepare asset files from cart assets', async () => {
      const cartAssets = [
        { name: 'asset1', path: 'common/assets/asset1', isPrivate: false },
      ];
      (mockDT.DTAssets.getFilesFromAsset as jest.Mock).mockResolvedValue([
        {
          name: 'file.json',
          content: 'original content',
          path: 'common/assets/asset1',
          isPrivate: false,
        },
      ]);

      const result = await prepareAllAssetFilesFn(
        mockDT,
        cartAssets as unknown as LibraryAssetInterface[],
        [],
      );

      expect(result).toEqual([
        {
          name: 'asset1/file.json',
          content: 'original content',
          isNew: true,
          isFromCommonLibrary: true,
        },
      ]);
    });

    it('should use updated library file content when available', async () => {
      const { getUpdatedLibraryFile } = jest.requireMock(
        'model/backend/util/digitalTwinUtils',
      );
      getUpdatedLibraryFile.mockReturnValue({
        fileContent: 'modified content',
      });

      const cartAssets = [
        { name: 'asset1', path: 'private/assets/asset1', isPrivate: true },
      ];
      (mockDT.DTAssets.getFilesFromAsset as jest.Mock).mockResolvedValue([
        {
          name: 'file.json',
          content: 'original',
          path: 'private/assets/asset1',
          isPrivate: true,
        },
      ]);

      const result = await prepareAllAssetFilesFn(
        mockDT,
        cartAssets as unknown as LibraryAssetInterface[],
        [],
      );

      expect(result).toEqual([
        {
          name: 'asset1/file.json',
          content: 'modified content',
          isNew: true,
          isFromCommonLibrary: false,
        },
      ]);
    });
  });
});
