import {
  handleFileClick,
  handleFileSubmit,
} from 'preview/route/digitaltwins/editor/sidebarFunctions';
import DigitalTwin from 'preview/util/digitalTwin';
import { FileState, addOrUpdateFile } from 'preview/store/file.slice';
import { mockGitlabInstance } from 'test/preview/__mocks__/global_mocks';
import { useDispatch } from 'react-redux';

describe('File Click Handlers', () => {
  const mockSetFileName = jest.fn();
  const mockSetFileContent = jest.fn();
  const mockSetFileType = jest.fn();

  const mockDigitalTwin = new DigitalTwin('Asset 1', mockGitlabInstance);

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls handleCreateFileClick if tab is "create"', () => {
    const fileName = 'example.md';
    const files: FileState[] = [
      { name: fileName, content: 'content', isNew: true, isModified: false },
    ];

    handleFileClick(
      fileName,
      null,
      mockSetFileName,
      mockSetFileContent,
      mockSetFileType,
      files,
      'create',
    );
    expect(mockSetFileName).toHaveBeenCalledWith(fileName);
    expect(mockSetFileContent).toHaveBeenCalledWith('content');
  });

  it('calls handleReconfigureFileClick if tab is "reconfigure"', () => {
    const fileName = 'example.json';
    const files: FileState[] = [
      { name: fileName, content: 'content', isNew: false, isModified: true },
    ];

    handleFileClick(
      fileName,
      mockDigitalTwin,
      mockSetFileName,
      mockSetFileContent,
      mockSetFileType,
      files,
      'reconfigure',
    );
    expect(mockSetFileName).toHaveBeenCalledWith(fileName);
    expect(mockSetFileContent).toHaveBeenCalledWith('content');
  });
});

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
}));

describe('handleFileSubmit', () => {
  const mockSetErrorMessage = jest.fn();
  const mockSetIsFileNameDialogOpen = jest.fn();
  const mockSetNewFileName = jest.fn();
  const dispatch = jest.fn();

  (useDispatch as unknown as jest.Mock).mockReturnValue(dispatch);

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('dispatches addOrUpdateFile if new file name does not exist', () => {
    const files: FileState[] = [
      { name: 'existingFile.md', content: '', isNew: true, isModified: false },
    ];
    const newFileName = 'newFile.md';

    handleFileSubmit(
      files,
      newFileName,
      mockSetErrorMessage,
      dispatch,
      mockSetIsFileNameDialogOpen,
      mockSetNewFileName,
    );
    expect(dispatch).toHaveBeenCalledWith(
      addOrUpdateFile({
        name: newFileName,
        content: '',
        isNew: true,
        isModified: false,
        type: 'description',
      }),
    );
    expect(mockSetIsFileNameDialogOpen).toHaveBeenCalledWith(false);
    expect(mockSetNewFileName).toHaveBeenCalledWith('');
  });

  it('sets error message if file name already exists', () => {
    const files: FileState[] = [
      { name: 'existingFile.md', content: '', isNew: true, isModified: false },
    ];
    const newFileName = 'existingFile.md';

    handleFileSubmit(
      files,
      newFileName,
      mockSetErrorMessage,
      dispatch,
      mockSetIsFileNameDialogOpen,
      mockSetNewFileName,
    );
    expect(mockSetErrorMessage).toHaveBeenCalledWith(
      'A file with this name already exists.',
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('sets error message if file name is empty', () => {
    const files: FileState[] = [
      { name: 'existingFile.md', content: '', isNew: true, isModified: false },
    ];
    const newFileName = '';

    handleFileSubmit(
      files,
      newFileName,
      mockSetErrorMessage,
      dispatch,
      mockSetIsFileNameDialogOpen,
      mockSetNewFileName,
    );
    expect(mockSetErrorMessage).toHaveBeenCalledWith(
      "File name can't be empty.",
    );
    expect(dispatch).not.toHaveBeenCalled();
  });
});
