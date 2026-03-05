import libraryFilesSlice, {
  addOrUpdateLibraryFile,
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
