import * as SidebarFunctions from 'route/digitaltwins/editor/sidebarFunctions';
import * as FileUtils from 'util/fileUtils';
import * as SidebarFetchers from 'route/digitaltwins/editor/sidebarFetchers';
import { mockLibraryAsset } from 'test/__mocks__/global_mocks';
import { FileState } from 'model/backend/interfaces/sharedInterfaces';

jest.mock('util/fileUtils');
jest.mock('route/digitaltwins/editor/sidebarFetchers');

describe('SidebarFunctions - handleFileClick and handleCreateFileClick', () => {
  const setFileName = jest.fn();
  const setFileContent = jest.fn();
  const setFileType = jest.fn();
  const setFilePrivacy = jest.fn();
  const setIsLibraryFile = jest.fn();
  const setLibraryAssetPath = jest.fn();

  const setters = {
    setFileName,
    setFileContent,
    setFileType,
    setFilePrivacy,
    setIsLibraryFile,
    setLibraryAssetPath,
  };

  const files: FileState[] = [];

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should handle file click correctly in create tab', () => {
    const tab = 'create';
    const handleCreateFileClick = jest
      .spyOn(SidebarFunctions, 'handleCreateFileClick')
      .mockImplementation(jest.fn());

    SidebarFunctions.handleFileClick(
      { fileName: 'file', asset: null, files },
      tab,
      setters,
    );

    expect(handleCreateFileClick).toHaveBeenCalled();
  });

  it('should handle file click correctly in reconfigure tab', () => {
    const tab = 'reconfigure';
    const handleReconfigureFileClick = jest
      .spyOn(SidebarFunctions, 'handleReconfigureFileClick')
      .mockImplementation(jest.fn());

    SidebarFunctions.handleFileClick(
      { fileName: 'file', asset: null, files },
      tab,
      setters,
    );

    expect(handleReconfigureFileClick).toHaveBeenCalled();
  });

  it('should not call updateFileState if no new file is found - create tab', () => {
    const testFiles: FileState[] = [
      { name: 'file1.md', content: 'content', isNew: false, isModified: false },
    ];
    const updateFileStateSpy = jest.spyOn(FileUtils, 'updateFileState');

    SidebarFunctions.handleCreateFileClick(
      { fileName: 'nonExistentFile', asset: null, files: testFiles },
      setters,
    );

    expect(updateFileStateSpy).not.toHaveBeenCalled();
  });

  it('should call updateFileState if new file is found - create tab', () => {
    const testFiles: FileState[] = [
      { name: 'file1.md', content: 'content', isNew: true, isModified: false },
    ];

    const updateFileStateSpy = jest
      .spyOn(FileUtils, 'updateFileState')
      .mockImplementation(jest.fn());

    SidebarFunctions.handleCreateFileClick(
      { fileName: 'file1.md', asset: null, files: testFiles },
      setters,
    );

    expect(updateFileStateSpy).toHaveBeenCalled();
  });

  it('should call updateFileState if modified library file is found - create tab', () => {
    const testFiles: FileState[] = [
      { name: 'file1.md', content: 'content', isNew: true, isModified: false },
    ];

    const testLibraryConfigFiles = [
      {
        assetPath: 'path',
        fileName: 'file1.md',
        fileContent: 'content',
        isNew: false,
        isModified: true,
        isPrivate: true,
      },
    ];

    const updateFileStateSpy = jest
      .spyOn(FileUtils, 'updateFileState')
      .mockImplementation(jest.fn());

    SidebarFunctions.handleCreateFileClick(
      { fileName: 'file1.md', asset: mockLibraryAsset, files: testFiles },
      setters,
      { libraryFiles: testLibraryConfigFiles },
    );

    expect(updateFileStateSpy).toHaveBeenCalled();
  });

  it('should call fetchAndSetFileLibraryContent if new library file is found - create tab', () => {
    const testFiles: FileState[] = [
      { name: 'file1.md', content: 'content', isNew: true, isModified: false },
    ];

    const testLibraryConfigFiles = [
      {
        assetPath: 'path',
        fileName: 'file1.md',
        fileContent: 'content',
        isNew: true,
        isModified: false,
        isPrivate: true,
      },
    ];

    const fetchAndSetFileLibraryContentSpy = jest
      .spyOn(SidebarFetchers, 'fetchAndSetFileLibraryContent')
      .mockImplementation(jest.fn());

    SidebarFunctions.handleCreateFileClick(
      { fileName: 'file1.md', asset: mockLibraryAsset, files: testFiles },
      setters,
      { libraryFiles: testLibraryConfigFiles },
    );

    expect(fetchAndSetFileLibraryContentSpy).toHaveBeenCalled();
  });
});
