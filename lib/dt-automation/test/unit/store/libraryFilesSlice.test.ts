import libraryFilesSlice, {
  addOrUpdateLibraryFile,
  initializeLibraryFile,
  removeAllModifiedLibraryFiles,
} from 'model/store/libraryConfigFiles.slice';
import { LibraryConfigFile } from 'model/backend/interfaces/sharedInterfaces';

describe('libraryFilesSlice', () => {
  const libraryFilesInitialState: LibraryConfigFile[] = [];

  it('should handle initial state', () => {
    expect(libraryFilesSlice(undefined, { type: 'unknown' })).toEqual(
      libraryFilesInitialState,
    );
  });

  it('should handle addOrUpdateLibraryFile', () => {
    const newFile: LibraryConfigFile = {
      assetPath: 'path1',
      fileName: 'file1',
      fileContent: 'content1',
      isNew: true,
      isModified: false,
      isPrivate: false,
    };

    const updatedFile: LibraryConfigFile = {
      ...newFile,
      fileContent: 'updated content',
      isModified: true,
    };

    let state = libraryFilesSlice(
      libraryFilesInitialState,
      addOrUpdateLibraryFile(newFile),
    );
    expect(state).toEqual([newFile]);

    state = libraryFilesSlice(state, addOrUpdateLibraryFile(updatedFile));
    expect(state).toEqual([updatedFile]);
  });

  it('should add new file with initializeLibraryFile', () => {
    const newFile: LibraryConfigFile = {
      assetPath: 'path1',
      fileName: 'file1',
      fileContent: '',
      isNew: true,
      isModified: false,
      isPrivate: false,
    };

    const state = libraryFilesSlice(
      libraryFilesInitialState,
      initializeLibraryFile(newFile),
    );
    expect(state).toEqual([newFile]);
  });

  it('should not overwrite existing file with initializeLibraryFile', () => {
    const existingFile: LibraryConfigFile = {
      assetPath: 'path1',
      fileName: 'file1',
      fileContent: 'modified',
      isNew: true,
      isModified: true,
      isPrivate: false,
    };

    const reinitPayload: LibraryConfigFile = {
      assetPath: 'path1',
      fileName: 'file1',
      fileContent: '',
      isNew: true,
      isModified: false,
      isPrivate: false,
    };

    const state = libraryFilesSlice(
      [existingFile],
      initializeLibraryFile(reinitPayload),
    );
    expect(state).toEqual([existingFile]);
  });

  it('should handle removeAllModifiedLibraryFiles', () => {
    const stateWithFiles: LibraryConfigFile[] = [
      {
        assetPath: 'path1',
        fileName: 'file1',
        fileContent: 'content1',
        isNew: false,
        isModified: true,
        isPrivate: false,
      },
      {
        assetPath: 'path2',
        fileName: 'file2',
        fileContent: 'content2',
        isNew: true,
        isModified: false,
        isPrivate: false,
      },
    ];

    const state = libraryFilesSlice(
      stateWithFiles,
      removeAllModifiedLibraryFiles(),
    );
    expect(state).toEqual([
      {
        assetPath: 'path2',
        fileName: 'file2',
        fileContent: 'content2',
        isNew: true,
        isModified: false,
        isPrivate: false,
      },
    ]);
  });
});
