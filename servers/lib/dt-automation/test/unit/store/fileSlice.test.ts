import fileSlice, {
  addOrUpdateFile,
  deleteFile,
  removeAllCreationFiles,
  removeAllFiles,
  removeAllModifiedFiles,
  renameFile,
} from 'model/store/file.slice';

describe('file reducer', () => {
  const emptyFiles: {
    name: string;
    content: string;
    isNew: boolean;
    isModified: boolean;
  }[] = [];

  const file1 = {
    name: 'fileName1',
    content: 'fileContent',
    isNew: true,
    isModified: false,
  };

  const file2 = {
    name: 'fileName2',
    content: 'fileContent2',
    isNew: false,
    isModified: false,
  };

  it('should add file with addOrUpdateFile', () => {
    const newState = fileSlice(emptyFiles, addOrUpdateFile(file1));
    expect(newState).toEqual([file1]);
  });

  it('should handle addOrUpdateFile when file already exists', () => {
    const file2Modified = {
      name: 'fileName2',
      content: 'newContent',
      isNew: false,
      isModified: false,
    };
    const fileState = [file1, file2];
    const newState = fileSlice(fileState, addOrUpdateFile(file2Modified));

    const file2AfterUpdate = {
      ...file2Modified,
      isModified: true,
    };

    expect(newState).toEqual([file1, file2AfterUpdate]);
  });

  it('should handle addOrUpdateFile with empty file name', () => {
    const fileEmptyName = {
      name: '',
      content: 'fileContent',
      isNew: true,
      isModified: false,
    };
    const newState = fileSlice(emptyFiles, addOrUpdateFile(fileEmptyName));
    expect(newState).toEqual([]);
  });

  it('should handle renameFile', () => {
    const fileState = [file1, file2];
    const newState = fileSlice(
      fileState,
      renameFile({ oldName: 'fileName2', newName: 'newName' }),
    );
    expect(newState[1].name).toBe('newName');
    expect(newState[1].isModified).toBe(true);
  });

  it('should handle renameFile with extension md', () => {
    const fileState = [file1, file2];
    const newState = fileSlice(
      fileState,
      renameFile({ oldName: 'fileName2', newName: 'newName.md' }),
    );
    expect(newState[1].type).toBe('description');
  });

  it('should handle renameFile with extension json', () => {
    const fileState = [file1, file2];
    const newState = fileSlice(
      fileState,
      renameFile({ oldName: 'fileName2', newName: 'newName.json' }),
    );
    expect(newState[1].type).toBe('configuration');
  });

  it('should handle removeAllModifiedFiles', () => {
    const file1Modified = {
      name: 'fileName1',
      content: 'newContent',
      isNew: false,
      isModified: true,
    };
    const fileState = [file1Modified, file2];
    const newState = fileSlice(fileState, removeAllModifiedFiles());
    expect(newState).toEqual([file2]);
  });

  it('should handle deleteFile', () => {
    const fileState = [file1, file2];
    const newState = fileSlice(fileState, deleteFile('fileName1'));
    expect(newState).toEqual([file2]);
  });

  it('should handle removeAllCreationFiles', () => {
    const fileState = [file1, file2];
    const newState = fileSlice(fileState, removeAllCreationFiles());
    expect(newState).toEqual([]);
  });

  it('should handle removeAllCreationFiles with protected files', () => {
    const descriptionFile = {
      name: 'description.md',
      content: 'fileContent',
      isNew: true,
      isModified: false,
    };

    const descriptionFileAfterUpdate = {
      name: 'description.md',
      content: '',
      isNew: true,
      isModified: false,
    };

    const fileState = [file1, file2, descriptionFile];
    const newState = fileSlice(fileState, removeAllCreationFiles());
    expect(newState).toEqual([descriptionFileAfterUpdate]);
  });

  it('should handle removeAllFiles', () => {
    const fileState = [file1, file2];
    const newState = fileSlice(fileState, removeAllFiles());
    expect(newState).toEqual([]);
  });
});
