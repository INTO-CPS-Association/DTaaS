import { LibraryConfigFile } from 'model/backend/gitlab/interfaces';
import * as fileUtils from 'preview/util/fileUtils';

describe('FileUtils', () => {
  const libraryFiles: LibraryConfigFile[] = [];

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
      { name: 'file1', type: 'lifecycle' },
      { name: 'file2', type: 'lifecycle' },
    ];

    const files = [
      { name: 'file1', content: 'content', isNew: true, isModified: false },
    ];

    const dispatch = jest.fn();

    fileUtils.addDefaultFiles(defaultFilesNames, files, dispatch);

    expect(dispatch).toHaveBeenCalled();
  });

  it('should change file name with extension', () => {
    const files = [
      { name: 'file1', content: 'content', isNew: true, isModified: false },
    ];

    const modifiedFileName = 'file2';
    const fileName = 'file1';

    const setFileName = jest.fn();
    const setFileType = jest.fn();
    const setErrorChangeMessage = jest.fn();
    const onClose = jest.fn();
    const dispatch = jest.fn();

    fileUtils.handleChangeFileName(
      files,
      modifiedFileName,
      fileName,
      setFileName,
      setFileType,
      setErrorChangeMessage,
      onClose,
      dispatch,
    );

    expect(setErrorChangeMessage).toHaveBeenCalledWith('');
    expect(dispatch).toHaveBeenCalled();
  });

  it('should return error message if file name is empty', () => {
    const files = [
      { name: 'file1', content: 'content', isNew: true, isModified: false },
    ];

    const modifiedFileName = '';
    const fileName = 'file1';

    const setFileName = jest.fn();
    const setFileType = jest.fn();
    const setErrorChangeMessage = jest.fn();
    const onClose = jest.fn();
    const dispatch = jest.fn();

    fileUtils.handleChangeFileName(
      files,
      modifiedFileName,
      fileName,
      setFileName,
      setFileType,
      setErrorChangeMessage,
      onClose,
      dispatch,
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

    const modifiedFileName = 'file2';
    const fileName = 'file1';

    const setFileName = jest.fn();
    const setFileType = jest.fn();
    const setErrorChangeMessage = jest.fn();
    const onClose = jest.fn();
    const dispatch = jest.fn();

    fileUtils.handleChangeFileName(
      files,
      modifiedFileName,
      fileName,
      setFileName,
      setFileType,
      setErrorChangeMessage,
      onClose,
      dispatch,
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
