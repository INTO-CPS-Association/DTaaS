import { useDispatch } from 'react-redux';
import {
  handleCreateFileClick,
  handleReconfigureFileClick,
  handleAddFileClick,
  handleCloseFileNameDialog,
  handleFileSubmit,
} from 'preview/route/digitaltwins/editor/sidebarFunctions';
import { FileState } from 'model/backend/gitlab/interfaces';
import { updateFileState } from 'preview/util/fileUtils';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
}));

jest.mock('preview/route/digitaltwins/editor/sidebarFetchers', () => ({
  fetchAndSetFileContent: jest.fn(),
  fetchAndSetFileLibraryContent: jest.fn(),
}));

jest.mock('preview/util/fileUtils', () => ({
  updateFileState: jest.fn(),
  getFileTypeFromExtension: jest.fn(),
}));

describe('sidebarFunctions integration tests', () => {
  const dispatch = jest.fn();
  (useDispatch as unknown as jest.Mock).mockReturnValue(dispatch);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('handleCreateFileClick with DigitalTwin asset', () => {
    const setFileName = jest.fn();
    const setFileContent = jest.fn();
    const setFileType = jest.fn();
    const setFilePrivacy = jest.fn();
    const setIsLibraryFile = jest.fn();
    const setLibraryAssetPath = jest.fn();
    const files: FileState[] = [
      { name: 'testFile', isNew: true, content: 'content', isModified: false },
    ];

    handleCreateFileClick(
      'testFile',
      null,
      files,
      setFileName,
      setFileContent,
      setFileType,
      setFilePrivacy,
      setIsLibraryFile,
      setLibraryAssetPath,
      dispatch,
    );

    expect(updateFileState).toHaveBeenCalled();
    expect(setIsLibraryFile).toHaveBeenCalledWith(false);
    expect(setLibraryAssetPath).toHaveBeenCalledWith('');
  });

  test('handleReconfigureFileClick with modified file', async () => {
    const setFileName = jest.fn();
    const setFileContent = jest.fn();
    const setFileType = jest.fn();
    const setFilePrivacy = jest.fn();
    const setIsLibraryFile = jest.fn();
    const setLibraryAssetPath = jest.fn();
    const files = [
      { name: 'testFile', isModified: true, isNew: false, content: 'content' },
    ];

    await handleReconfigureFileClick(
      'testFile',
      null,
      files,
      setFileName,
      setFileContent,
      setFileType,
      setFilePrivacy,
      setIsLibraryFile,
      setLibraryAssetPath,
      dispatch,
    );

    expect(updateFileState).toHaveBeenCalled();
    expect(setIsLibraryFile).toHaveBeenCalledWith(false);
    expect(setLibraryAssetPath).toHaveBeenCalledWith('');
  });

  test('handleAddFileClick', () => {
    const setIsFileNameDialogOpen = jest.fn();

    handleAddFileClick(setIsFileNameDialogOpen);

    expect(setIsFileNameDialogOpen).toHaveBeenCalledWith(true);
  });

  test('handleCloseFileNameDialog', () => {
    const setIsFileNameDialogOpen = jest.fn();
    const setNewFileName = jest.fn();
    const setErrorMessage = jest.fn();

    handleCloseFileNameDialog(
      setIsFileNameDialogOpen,
      setNewFileName,
      setErrorMessage,
    );

    expect(setIsFileNameDialogOpen).toHaveBeenCalledWith(false);
    expect(setNewFileName).toHaveBeenCalledWith('');
    expect(setErrorMessage).toHaveBeenCalledWith('');
  });

  test('handleFileSubmit with existing file', () => {
    const files: FileState[] = [
      { name: 'testFile', content: 'content', isNew: false, isModified: false },
    ];
    const setErrorMessage = jest.fn();
    const setIsFileNameDialogOpen = jest.fn();
    const setNewFileName = jest.fn();

    handleFileSubmit(
      files,
      'testFile',
      setErrorMessage,
      dispatch,
      setIsFileNameDialogOpen,
      setNewFileName,
    );

    expect(setErrorMessage).toHaveBeenCalledWith(
      'A file with this name already exists.',
    );
  });

  test('handleFileSubmit with new file', () => {
    const files: FileState[] = [];
    const setErrorMessage = jest.fn();
    const setIsFileNameDialogOpen = jest.fn();
    const setNewFileName = jest.fn();

    handleFileSubmit(
      files,
      'newFile',
      setErrorMessage,
      dispatch,
      setIsFileNameDialogOpen,
      setNewFileName,
    );

    expect(setErrorMessage).toHaveBeenCalledWith('');
    expect(dispatch).toHaveBeenCalled();
    expect(setIsFileNameDialogOpen).toHaveBeenCalledWith(false);
    expect(setNewFileName).toHaveBeenCalledWith('');
  });
});
