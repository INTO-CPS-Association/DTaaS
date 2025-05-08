import * as SidebarFunctions from 'preview/route/digitaltwins/editor/sidebarFunctions';
import { FileState } from 'model/backend/gitlab/interfaces';
import * as FileUtils from 'preview/util/fileUtils';
import * as SidebarFetchers from 'preview/route/digitaltwins/editor/sidebarFetchers';
import { mockLibraryAsset } from 'test/preview/__mocks__/global_mocks';

jest.mock('preview/util/fileUtils');
jest.mock('preview/route/digitaltwins/editor/sidebarFetchers');

describe('SidebarFunctions', () => {
  const setFileName = jest.fn();
  const setFileContent = jest.fn();
  const setFileType = jest.fn();
  const setFilePrivacy = jest.fn();
  const setIsLibraryFile = jest.fn();
  const setLibraryAssetPath = jest.fn();
  const setIsFileNameDialogOpen = jest.fn();
  const setNewFileName = jest.fn();
  const setErrorMessage = jest.fn();
  const dispatch = jest.fn();

  const files: FileState[] = [];

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('should handle file click correctly in create tab', () => {
    const tab = 'create';
    const handleCreateFileClick = jest
      .spyOn(SidebarFunctions, 'handleCreateFileClick')
      .mockImplementation(jest.fn());

    SidebarFunctions.handleFileClick(
      'file',
      null,
      setFileName,
      setFileContent,
      setFileType,
      setFilePrivacy,
      files,
      tab,
      setIsLibraryFile,
      setLibraryAssetPath,
    );

    expect(handleCreateFileClick).toHaveBeenCalled();
  });

  it('should handle file click correctly in reconfigure tab', () => {
    const tab = 'reconfigure';
    const handleReconfigureFileClick = jest
      .spyOn(SidebarFunctions, 'handleReconfigureFileClick')
      .mockImplementation(jest.fn());

    SidebarFunctions.handleFileClick(
      'file',
      null,
      setFileName,
      setFileContent,
      setFileType,
      setFilePrivacy,
      files,
      tab,
      setIsLibraryFile,
      setLibraryAssetPath,
    );

    expect(handleReconfigureFileClick).toHaveBeenCalled();
  });

  it('should not call updateFileState if no new file is found - create tab', async () => {
    const testFiles: FileState[] = [
      { name: 'file1.md', content: 'content', isNew: false, isModified: false },
    ];
    const updateFileStateSpy = jest.spyOn(FileUtils, 'updateFileState');

    await SidebarFunctions.handleCreateFileClick(
      'nonExistentFile',
      null,
      testFiles,
      setFileName,
      setFileContent,
      setFileType,
      setFilePrivacy,
      setIsLibraryFile,
      setLibraryAssetPath,
    );

    expect(updateFileStateSpy).not.toHaveBeenCalled();
  });

  it('should call updateFileState if new file is found - create tab', async () => {
    const testFiles: FileState[] = [
      { name: 'file1.md', content: 'content', isNew: true, isModified: false },
    ];

    const updateFileStateSpy = jest
      .spyOn(FileUtils, 'updateFileState')
      .mockImplementation(jest.fn());

    await SidebarFunctions.handleCreateFileClick(
      'file1.md',
      null,
      testFiles,
      setFileName,
      setFileContent,
      setFileType,
      setFilePrivacy,
      setIsLibraryFile,
      setLibraryAssetPath,
    );

    expect(updateFileStateSpy).toHaveBeenCalled();
  });

  it('should call updateFileState if modified library file is found - create tab', async () => {
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

    await SidebarFunctions.handleCreateFileClick(
      'file1.md',
      mockLibraryAsset,
      testFiles,
      setFileName,
      setFileContent,
      setFileType,
      setFilePrivacy,
      setIsLibraryFile,
      setLibraryAssetPath,
      undefined,
      testLibraryConfigFiles,
    );

    expect(updateFileStateSpy).toHaveBeenCalled();
  });

  it('should call fetchAndSetFileLibraryContent if new library file is found - create tab', async () => {
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

    await SidebarFunctions.handleCreateFileClick(
      'file1.md',
      mockLibraryAsset,
      testFiles,
      setFileName,
      setFileContent,
      setFileType,
      setFilePrivacy,
      setIsLibraryFile,
      setLibraryAssetPath,
      undefined,
      testLibraryConfigFiles,
    );

    expect(fetchAndSetFileLibraryContentSpy).toHaveBeenCalled();
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
      setFileName,
      setFileContent,
      setFileType,
      setFilePrivacy,
      setIsLibraryFile,
      setLibraryAssetPath,
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
      setFileName,
      setFileContent,
      setFileType,
      setFilePrivacy,
      setIsLibraryFile,
      setLibraryAssetPath,
    );

    expect(fetchAndSetFileContentSpy).toHaveBeenCalled();
  });

  it('should handle add file click correctly', () => {
    SidebarFunctions.handleAddFileClick(setIsFileNameDialogOpen);

    expect(setIsFileNameDialogOpen).toHaveBeenCalledWith(true);
  });

  it('should handle file submit correctly', () => {
    const testFiles = [
      { name: 'file1', content: 'content', isNew: true, isModified: false },
    ];
    SidebarFunctions.handleFileSubmit(
      testFiles,
      'file2',
      setErrorMessage,
      dispatch,
      setIsFileNameDialogOpen,
      setNewFileName,
    );

    expect(dispatch).toHaveBeenCalled();
    expect(setIsFileNameDialogOpen).toHaveBeenCalledWith(false);
  });

  it('should set error message when file name already exists', () => {
    const testFiles = [
      { name: 'file1', content: 'content', isNew: true, isModified: false },
    ];
    SidebarFunctions.handleFileSubmit(
      testFiles,
      'file1',
      setErrorMessage,
      dispatch,
      setIsFileNameDialogOpen,
      setNewFileName,
    );

    expect(setErrorMessage).toHaveBeenCalledWith(
      'A file with this name already exists.',
    );
  });

  it('should set error message when file name is empty', () => {
    const testFiles = [
      { name: 'file1', content: 'content', isNew: true, isModified: false },
    ];
    SidebarFunctions.handleFileSubmit(
      testFiles,
      '',
      setErrorMessage,
      dispatch,
      setIsFileNameDialogOpen,
      setNewFileName,
    );

    expect(setErrorMessage).toHaveBeenCalledWith("File name can't be empty.");
  });
});
