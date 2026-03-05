import {
  FileType,
  LibraryConfigFile,
} from 'model/backend/interfaces/sharedInterfaces';
import * as fileUtils from 'util/fileUtils';
import * as fileActions from 'util/fileActions';

describe('FileUtils', () => {
  const libraryFiles: LibraryConfigFile[] = [];

  const callHandleChangeFileName = (
    files: {
      name: string;
      content: string;
      isNew: boolean;
      isModified: boolean;
    }[],
    modifiedFileName: string,
    currentFileName: string,
  ) => {
    const setFileName = jest.fn();
    const setFileType = jest.fn();
    const setErrorChangeMessage = jest.fn();
    const onClose = jest.fn();
    const dispatch = jest.fn();

    fileActions.handleChangeFileName({
      files,
      modifiedFileName,
      currentFileName,
      setFileName,
      setFileType,
      setErrorMessage: setErrorChangeMessage,
      setOpenDialog: onClose,
      dispatch,
    });

    return {
      setFileName,
      setFileType,
      setErrorChangeMessage,
      onClose,
      dispatch,
    };
  };

  it('should return true if some files are empty', () => {
    const files = [
      { name: 'file1', content: '', isNew: true, isModified: false },
      { name: 'file2', content: 'content', isNew: true, isModified: false },
    ];

    const setErrorMessage = jest.fn();

    const result = fileUtils.validateFiles(
      files,
      libraryFiles,
      setErrorMessage,
    );

    expect(result).toBe(true);
    expect(setErrorMessage).toHaveBeenCalledWith(
      'The following files have empty content: file1.\n Edit them in order to create the new digital twin.',
    );
  });

  it('should return false if no files are empty', () => {
    const files = [
      { name: 'file1', content: 'content', isNew: true, isModified: false },
      { name: 'file2', content: 'content', isNew: true, isModified: false },
    ];

    const setErrorMessage = jest.fn();

    const result = fileUtils.validateFiles(
      files,
      libraryFiles,
      setErrorMessage,
    );

    expect(result).toBe(false);
    expect(setErrorMessage).not.toHaveBeenCalled();
  });

  it('should add default files', () => {
    const defaultFilesNames = [
      { name: 'file1', type: FileType.LIFECYCLE },
      { name: 'file2', type: FileType.LIFECYCLE },
    ];

    const files = [
      { name: 'file1', content: 'content', isNew: true, isModified: false },
    ];

    const dispatch = jest.fn();

    fileActions.addDefaultFiles(defaultFilesNames, files, dispatch);

    expect(dispatch).toHaveBeenCalled();
  });

  it('should change file name with extension', () => {
    const files = [
      { name: 'file1', content: 'content', isNew: true, isModified: false },
    ];

    const { setErrorChangeMessage, dispatch } = callHandleChangeFileName(
      files,
      'file2',
      'file1',
    );

    expect(setErrorChangeMessage).toHaveBeenCalledWith('');
    expect(dispatch).toHaveBeenCalled();
  });

  it('should return error message if file name is empty', () => {
    const files = [
      { name: 'file1', content: 'content', isNew: true, isModified: false },
    ];

    const { setErrorChangeMessage, dispatch } = callHandleChangeFileName(
      files,
      '',
      'file1',
    );

    expect(setErrorChangeMessage).toHaveBeenCalledWith(
      "File name can't be empty.",
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('should return error message if file name already exists', () => {
    const files = [
      { name: 'file1', content: 'content', isNew: true, isModified: false },
      { name: 'file2', content: 'content', isNew: true, isModified: false },
    ];

    const { setErrorChangeMessage, dispatch } = callHandleChangeFileName(
      files,
      'file2',
      'file1',
    );

    expect(setErrorChangeMessage).toHaveBeenCalledWith(
      'A file with this name already exists.',
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('should return empty string if no extension', () => {
    const fileName = 'file1';

    const result = fileUtils.getExtension(fileName);

    expect(result).toBe('');
  });

  it('should return extension', () => {
    const fileName = 'file1.txt';

    const result = fileUtils.getExtension(fileName);

    expect(result).toBe('txt');
  });
});
