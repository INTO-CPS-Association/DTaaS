import DigitalTwin from 'model/backend/digitalTwin';
import { getUpdatedLibraryFile } from 'model/backend/util/digitalTwinUtils';
import {
  mockGitlabInstance,
  setupBeforeEach,
  createDigitalTwin,
} from './testSetup';

jest.mock('model/backend/util/digitalTwinUtils', () => ({
  ...jest.requireActual('model/backend/util/digitalTwinUtils'),
  getUpdatedLibraryFile: jest.fn(),
}));

describe('DigitalTwin - prepareAllAssetFiles', () => {
  let dt: DigitalTwin;
  const mockGetUpdatedLibraryFile =
    getUpdatedLibraryFile as jest.MockedFunction<typeof getUpdatedLibraryFile>;

  beforeEach(() => {
    dt = createDigitalTwin();
    setupBeforeEach(dt);
    mockGetUpdatedLibraryFile.mockClear();
  });

  afterEach(() => {
    mockGitlabInstance.getProjectId = jest.fn().mockReturnValue(1);
  });

  it('should process cart assets and library files', async () => {
    const mockCartAssets = [
      { name: 'asset1', path: 'path/to/asset1', isPrivate: false },
    ];
    const mockLibraryFiles = [
      { name: 'config.json', fileContent: 'updated content' },
    ];
    const mockAssetFiles = [
      {
        name: 'config.json',
        content: 'original content',
        path: 'path/to/config.json',
        isPrivate: false,
      },
    ];

    jest
      .spyOn(dt.DTAssets, 'getFilesFromAsset')
      .mockResolvedValue(mockAssetFiles);
    mockGetUpdatedLibraryFile.mockReturnValue({
      fileContent: 'updated content',
    } as unknown as ReturnType<typeof mockGetUpdatedLibraryFile>);

    const result = await dt.prepareAllAssetFiles(
      mockCartAssets as unknown as Parameters<
        typeof dt.prepareAllAssetFiles
      >[0],
      mockLibraryFiles as unknown as Parameters<
        typeof dt.prepareAllAssetFiles
      >[1],
    );

    expect(dt.DTAssets.getFilesFromAsset).toHaveBeenCalledWith(
      'path/to/asset1',
      false,
    );
    expect(mockGetUpdatedLibraryFile).toHaveBeenCalledWith(
      'config.json',
      'path/to/asset1',
      false,
      mockLibraryFiles,
    );
    expect(result).toEqual([
      {
        name: 'asset1/config.json',
        content: 'updated content',
        isNew: true,
        isFromCommonLibrary: true,
      },
    ]);
  });

  it('should handle empty cart assets', async () => {
    const result = await dt.prepareAllAssetFiles([], []);
    expect(result).toEqual([]);
  });

  it('should handle assets without library file updates', async () => {
    const mockCartAssets = [
      { name: 'asset1', path: 'path/to/asset1', isPrivate: true },
    ];
    const mockAssetFiles = [
      {
        name: 'file.txt',
        content: 'original content',
        path: 'path/to/file.txt',
        isPrivate: true,
      },
    ];

    jest
      .spyOn(dt.DTAssets, 'getFilesFromAsset')
      .mockResolvedValue(mockAssetFiles);
    mockGetUpdatedLibraryFile.mockReturnValue(null);

    const result = await dt.prepareAllAssetFiles(
      mockCartAssets as unknown as Parameters<
        typeof dt.prepareAllAssetFiles
      >[0],
      [],
    );

    expect(mockGetUpdatedLibraryFile).toHaveBeenCalledWith(
      'file.txt',
      'path/to/asset1',
      true,
      [],
    );
    expect(result).toEqual([
      {
        name: 'asset1/file.txt',
        content: 'original content',
        isNew: true,
        isFromCommonLibrary: false,
      },
    ]);
  });
});
