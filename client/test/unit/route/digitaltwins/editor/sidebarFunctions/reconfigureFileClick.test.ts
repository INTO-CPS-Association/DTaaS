import * as SidebarFunctions from 'route/digitaltwins/editor/sidebarFunctions';
import * as FileUtils from 'util/fileUtils';
import * as SidebarFetchers from 'route/digitaltwins/editor/sidebarFetchers';
import { FileState } from 'model/backend/interfaces/sharedInterfaces';
import DigitalTwin from 'model/backend/digitalTwin';
import { mockDTAssets } from 'test/__mocks__/global_mocks';

jest.mock('util/fileUtils');
jest.mock('route/digitaltwins/editor/sidebarFetchers');

const createMockDT = () => {
  const dt = Object.create(DigitalTwin.prototype);
  dt.DTAssets = mockDTAssets;
  return dt as DigitalTwin;
};

describe('SidebarFunctions - handleReconfigureFileClick', () => {
  const setFileName = jest.fn();
  const setFileContent = jest.fn();
  const setFileType = jest.fn();
  const setFilePrivacy = jest.fn();
  const setIsLibraryFile = jest.fn();
  const setLibraryAssetPath = jest.fn();
  const dispatch = jest.fn();

  const setters = {
    setFileName,
    setFileContent,
    setFileType,
    setFilePrivacy,
    setIsLibraryFile,
    setLibraryAssetPath,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return early for non-DigitalTwin asset', async () => {
    const updateSpy = jest
      .spyOn(FileUtils, 'updateFileState')
      .mockImplementation(jest.fn());

    await SidebarFunctions.handleReconfigureFileClick(
      { fileName: 'file.md', asset: { notADT: true } as never, files: [] },
      setters,
    );

    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('should call updateFileState for modified DT file', async () => {
    const testFiles: FileState[] = [
      { name: 'file1.md', content: 'modified', isNew: false, isModified: true },
    ];

    const updateSpy = jest
      .spyOn(FileUtils, 'updateFileState')
      .mockImplementation(jest.fn());

    await SidebarFunctions.handleReconfigureFileClick(
      { fileName: 'file1.md', asset: createMockDT(), files: testFiles },
      setters,
    );

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: 'file1.md',
        fileContent: 'modified',
      }),
    );
    expect(setIsLibraryFile).toHaveBeenCalledWith(false);
    expect(setLibraryAssetPath).toHaveBeenCalledWith('');
  });

  it('should call fetchAndSetFileContent for unmodified DT file', async () => {
    const testFiles: FileState[] = [
      { name: 'file1.md', content: 'c', isNew: false, isModified: false },
    ];

    const fetchSpy = jest
      .spyOn(SidebarFetchers, 'fetchAndSetFileContent')
      .mockImplementation(jest.fn());

    await SidebarFunctions.handleReconfigureFileClick(
      { fileName: 'file1.md', asset: createMockDT(), files: testFiles },
      setters,
    );

    expect(fetchSpy).toHaveBeenCalled();
    expect(setIsLibraryFile).toHaveBeenCalledWith(false);
    expect(setLibraryAssetPath).toHaveBeenCalledWith('');
  });

  it('should apply modified library file with isPrivate', async () => {
    const testFiles: FileState[] = [];
    const libraryFiles = [
      {
        assetPath: 'test/path',
        fileName: 'lib.md',
        fileContent: 'updated',
        isNew: false,
        isModified: true,
        isPrivate: false,
      },
    ];

    const updateSpy = jest
      .spyOn(FileUtils, 'updateFileState')
      .mockImplementation(jest.fn());

    await SidebarFunctions.handleReconfigureFileClick(
      { fileName: 'lib.md', asset: createMockDT(), files: testFiles },
      setters,
      {
        dispatch,
        library: true,
        libraryFiles,
        assetPath: 'test/path',
      },
    );

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ isPrivate: false }),
    );
    expect(setIsLibraryFile).toHaveBeenCalledWith(true);
    expect(setLibraryAssetPath).toHaveBeenCalledWith('test/path');
  });

  it('should fetch library file when not modified', async () => {
    const testFiles: FileState[] = [];
    const libraryFiles = [
      {
        assetPath: 'test/path',
        fileName: 'lib.md',
        fileContent: '',
        isNew: false,
        isModified: false,
        isPrivate: true,
      },
    ];

    const updateSpy = jest
      .spyOn(FileUtils, 'updateFileState')
      .mockImplementation(jest.fn());

    (mockDTAssets.getLibraryFileContent as jest.Mock).mockResolvedValue(
      'fetched content',
    );

    await SidebarFunctions.handleReconfigureFileClick(
      { fileName: 'lib.md', asset: createMockDT(), files: testFiles },
      setters,
      {
        dispatch,
        library: true,
        libraryFiles,
        assetPath: 'test/path',
      },
    );

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: 'lib.md',
        fileContent: 'fetched content',
      }),
    );
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          fileName: 'lib.md',
          isPrivate: true,
        }),
      }),
    );
    expect(setIsLibraryFile).toHaveBeenCalledWith(true);
  });

  it('should derive isPrivate false for common library path', async () => {
    const updateSpy = jest
      .spyOn(FileUtils, 'updateFileState')
      .mockImplementation(jest.fn());

    (mockDTAssets.getLibraryFileContent as jest.Mock).mockResolvedValue(
      'content',
    );

    await SidebarFunctions.handleReconfigureFileClick(
      { fileName: 'lib.md', asset: createMockDT(), files: [] },
      setters,
      {
        dispatch,
        library: true,
        libraryFiles: [],
        assetPath: 'common/some-asset',
      },
    );

    expect(updateSpy).toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ isPrivate: false }),
      }),
    );
  });

  it('should return early from fetchLibraryFile when missing assetPath', async () => {
    await SidebarFunctions.handleReconfigureFileClick(
      { fileName: 'lib.md', asset: createMockDT(), files: [] },
      setters,
      { dispatch, library: true, libraryFiles: [] },
    );

    expect(mockDTAssets.getLibraryFileContent).not.toHaveBeenCalled();
  });

  it('should return early from fetchLibraryFile when missing dispatch', async () => {
    await SidebarFunctions.handleReconfigureFileClick(
      { fileName: 'lib.md', asset: createMockDT(), files: [] },
      setters,
      { library: true, libraryFiles: [], assetPath: 'test/path' },
    );

    expect(mockDTAssets.getLibraryFileContent).not.toHaveBeenCalled();
  });
});
