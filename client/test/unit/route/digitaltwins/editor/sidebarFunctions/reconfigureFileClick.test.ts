import * as SidebarFunctions from 'route/digitaltwins/editor/sidebarFunctions';
import * as FileUtils from 'util/fileUtils';
import * as SidebarFetchers from 'route/digitaltwins/editor/sidebarFetchers';
import { FileState } from 'model/backend/interfaces/sharedInterfaces';

jest.mock('util/fileUtils');
jest.mock('route/digitaltwins/editor/sidebarFetchers');

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
    jest.restoreAllMocks();
  });

  it('should call updateFileState if new file is found - reconfigure tab', async () => {
    const testFiles: FileState[] = [
      { name: 'file1.md', content: 'content', isNew: false, isModified: true },
    ];

    const updateFileStateSpy = jest
      .spyOn(FileUtils, 'updateFileState')
      .mockImplementation(jest.fn());

    await SidebarFunctions.handleReconfigureFileClick(
      'file1.md',
      null,
      testFiles,
      setters,
    );

    expect(updateFileStateSpy).toHaveBeenCalled();
  });

  it('should call fetchAndSetFileContent if new file is found - reconfigure tab', async () => {
    const testFiles: FileState[] = [
      { name: 'file1.md', content: 'content', isNew: false, isModified: false },
    ];

    const fetchAndSetFileContentSpy = jest
      .spyOn(SidebarFetchers, 'fetchAndSetFileContent')
      .mockImplementation(jest.fn());

    await SidebarFunctions.handleReconfigureFileClick(
      'file1.md',
      null,
      testFiles,
      setters,
    );

    expect(fetchAndSetFileContentSpy).toHaveBeenCalled();
  });

  it('should call setLibraryAssetPath when reconfiguring modified library file', async () => {
    const testFiles: FileState[] = [
      { name: 'file1.md', content: 'content', isNew: false, isModified: false },
    ];

    const testLibraryConfigFiles = [
      {
        assetPath: 'test/path',
        fileName: 'file1.md',
        fileContent: 'updated content',
        isNew: false,
        isModified: true,
        isPrivate: true,
      },
    ];

    const updateFileStateSpy = jest
      .spyOn(FileUtils, 'updateFileState')
      .mockImplementation(jest.fn());

    await SidebarFunctions.handleReconfigureFileClick(
      'file1.md',
      null,
      testFiles,
      setters,
      dispatch,
      true,
      testLibraryConfigFiles,
      'test/path',
    );

    expect(updateFileStateSpy).toHaveBeenCalled();
    expect(setIsLibraryFile).toHaveBeenCalledWith(true);
    expect(setLibraryAssetPath).toHaveBeenCalledWith('test/path');
  });
});
