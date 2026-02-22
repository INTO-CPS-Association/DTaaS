import * as SidebarFunctions from 'route/digitaltwins/editor/sidebarFunctions';

jest.mock('util/fileUtils');
jest.mock('route/digitaltwins/editor/sidebarFetchers');

describe('SidebarFunctions - handleAddFileClick and handleFileSubmit', () => {
  const setIsFileNameDialogOpen = jest.fn();
  const setNewFileName = jest.fn();
  const setErrorMessage = jest.fn();
  const dispatch = jest.fn();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should handle add file click correctly', () => {
    SidebarFunctions.handleAddFileClick(setIsFileNameDialogOpen);

    expect(setIsFileNameDialogOpen).toHaveBeenCalledWith(true);
  });

  it('should handle file submit correctly', () => {
    const testFiles = [
      { name: 'file1', content: 'content', isNew: true, isModified: false },
    ];
    SidebarFunctions.handleFileSubmit(testFiles, 'file2', dispatch, {
      setErrorMessage,
      setIsFileNameDialogOpen,
      setNewFileName,
    });

    expect(dispatch).toHaveBeenCalled();
    expect(setIsFileNameDialogOpen).toHaveBeenCalledWith(false);
  });

  it('should set error message when file name already exists', () => {
    const testFiles = [
      { name: 'file1', content: 'content', isNew: true, isModified: false },
    ];
    SidebarFunctions.handleFileSubmit(testFiles, 'file1', dispatch, {
      setErrorMessage,
      setIsFileNameDialogOpen,
      setNewFileName,
    });

    expect(setErrorMessage).toHaveBeenCalledWith(
      'A file with this name already exists.',
    );
  });

  it('should set error message when file name is empty', () => {
    const testFiles = [
      { name: 'file1', content: 'content', isNew: true, isModified: false },
    ];
    SidebarFunctions.handleFileSubmit(testFiles, '', dispatch, {
      setErrorMessage,
      setIsFileNameDialogOpen,
      setNewFileName,
    });

    expect(setErrorMessage).toHaveBeenCalledWith("File name can't be empty.");
  });
});
