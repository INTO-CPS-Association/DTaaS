/* eslint-disable no-shadow */

import assetsSlice, {
  deleteAsset,
  setAssets,
} from 'preview/store/assets.slice';
import digitalTwinReducer, {
  setDigitalTwin,
  setPipelineCompleted,
  setPipelineLoading,
  updateDescription,
} from 'preview/store/digitalTwin.slice';
import DigitalTwin from 'preview/util/digitalTwin';
import GitlabInstance from 'model/backend/gitlab/gitlab';
import snackbarSlice, {
  hideSnackbar,
  showSnackbar,
} from 'preview/store/snackbar.slice';
import { AlertColor } from '@mui/material';
import fileSlice, {
  addOrUpdateFile,
  deleteFile,
  removeAllCreationFiles,
  removeAllFiles,
  removeAllModifiedFiles,
  renameFile,
} from 'preview/store/file.slice';
import LibraryAsset from 'preview/util/libraryAsset';
import { mockLibraryAsset } from 'test/preview/__mocks__/global_mocks';
import cartSlice, {
  addToCart,
  clearCart,
  removeFromCart,
} from 'preview/store/cart.slice';
import libraryFilesSlice, {
  LibraryConfigFile,
  addOrUpdateLibraryFile,
  removeAllModifiedLibraryFiles,
} from 'preview/store/libraryConfigFiles.slice';

describe('reducers', () => {
  let initialState: {
    assets: {
      items: LibraryAsset[];
    };
    digitalTwin: {
      [key: string]: DigitalTwin;
    };
    snackbar: {
      open: boolean;
      message: string;
      severity: AlertColor;
    };
    files: {
      name: string;
      content: string;
      isNew: boolean;
      isModified: boolean;
    }[];
    cart: {
      assets: LibraryAsset[];
    };
    libraryConfigFiles: {
      name: string;
      content: string;
      isNew: boolean;
      isModified: boolean;
    }[];
  };

  beforeEach(() => {
    initialState = {
      assets: { items: [] },
      digitalTwin: {},
      snackbar: {
        open: false,
        message: '',
        severity: 'info',
      },
      files: [],
      cart: { assets: [] },
      libraryConfigFiles: [],
    };
  });

  describe('assets reducer', () => {
    const asset1 = mockLibraryAsset;

    it('should handle setAssets', () => {
      const newState = assetsSlice(initialState.assets, setAssets([asset1]));

      expect(newState.items).toEqual([asset1]);
    });

    it('should handle deleteAsset', () => {
      initialState.assets.items = [asset1];
      const newState = assetsSlice(initialState.assets, deleteAsset('path'));

      expect(newState.items).toEqual([]);
    });
  });

  describe('digitalTwin reducer', () => {
    const digitalTwin = new DigitalTwin(
      'asset1',
      new GitlabInstance('user1', 'authority', 'token1'),
    );

    const initialState = {
      digitalTwin: {},
      shouldFetchDigitalTwins: true,
    };

    it('should return the initial state when an unknown action is passed with an undefined state', () => {
      expect(digitalTwinReducer(undefined, { type: 'unknown' })).toEqual(
        initialState,
      );
    });

    it('should handle setDigitalTwin', () => {
      const newState = digitalTwinReducer(
        initialState,
        setDigitalTwin({ assetName: 'asset1', digitalTwin }),
      );
      expect(newState.digitalTwin.asset1).toEqual(digitalTwin);
    });

    it('should handle setPipelineCompleted', () => {
      const updatedDigitalTwin = new DigitalTwin(
        'asset1',
        new GitlabInstance('user1', 'authority', 'token1'),
      );
      updatedDigitalTwin.pipelineCompleted = false;

      const updatedState = {
        digitalTwin: {
          asset1: updatedDigitalTwin,
        },
        shouldFetchDigitalTwins: true,
      };

      const newState = digitalTwinReducer(
        updatedState,
        setPipelineCompleted({ assetName: 'asset1', pipelineCompleted: true }),
      );

      expect(newState.digitalTwin.asset1.pipelineCompleted).toBe(true);
    });

    it('should handle setPipelineLoading', () => {
      const updatedDigitalTwin = new DigitalTwin(
        'asset1',
        new GitlabInstance('user1', 'authority', 'token1'),
      );
      updatedDigitalTwin.pipelineLoading = false;

      const updatedState = {
        ...initialState,
        digitalTwin: { asset1: updatedDigitalTwin },
      };

      const newState = digitalTwinReducer(
        updatedState,
        setPipelineLoading({ assetName: 'asset1', pipelineLoading: true }),
      );

      expect(newState.digitalTwin.asset1.pipelineLoading).toBe(true);
    });

    it('should handle updateDescription', () => {
      const updatedDigitalTwin = new DigitalTwin(
        'asset1',
        new GitlabInstance('user1', 'authority', 'token1'),
      );
      updatedDigitalTwin.description = '';

      const updatedState = {
        ...initialState,
        digitalTwin: { asset1: updatedDigitalTwin },
      };

      const description = 'new description';

      const newState = digitalTwinReducer(
        updatedState,
        updateDescription({ assetName: 'asset1', description }),
      );

      expect(newState.digitalTwin.asset1.description).toBe(description);
    });
  });

  describe('snackbar reducer', () => {
    it('should handle showSnackbar', () => {
      const message = 'message';
      const severity = 'error';
      const newState = snackbarSlice(
        initialState.snackbar,
        showSnackbar({ message, severity }),
      );
      expect(newState.open).toBe(true);
      expect(newState.message).toBe(message);
      expect(newState.severity).toBe(severity);
    });

    it('should handle hideSnackbar', () => {
      initialState.snackbar.open = true;
      initialState.snackbar.message = 'message';
      initialState.snackbar.severity = 'error';
      const newState = snackbarSlice(initialState.snackbar, hideSnackbar());
      expect(newState.open).toBe(false);
      expect(newState.message).toBe('');
      expect(newState.severity).toBe('info');
    });
  });

  describe('file reducer', () => {
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
      const newState = fileSlice(initialState.files, addOrUpdateFile(file1));
      expect(newState).toEqual([file1]);
    });

    it('should handle addOrUpdateFile when file already exists', () => {
      const file2Modified = {
        name: 'fileName2',
        content: 'newContent',
        isNew: false,
        isModified: false,
      };
      const initialState = [file1, file2];
      const newState = fileSlice(initialState, addOrUpdateFile(file2Modified));

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
      const newState = fileSlice(
        initialState.files,
        addOrUpdateFile(fileEmptyName),
      );
      expect(newState).toEqual([]);
    });

    it('should handle renameFile', () => {
      const initialState = [file1, file2];
      const newState = fileSlice(
        initialState,
        renameFile({ oldName: 'fileName2', newName: 'newName' }),
      );
      expect(newState[1].name).toBe('newName');
      expect(newState[1].isModified).toBe(true);
    });

    it('should handle renameFile with extension md', () => {
      const initialState = [file1, file2];
      const newState = fileSlice(
        initialState,
        renameFile({ oldName: 'fileName2', newName: 'newName.md' }),
      );
      expect(newState[1].type).toBe('description');
    });

    it('should handle renameFile with extension json', () => {
      const initialState = [file1, file2];
      const newState = fileSlice(
        initialState,
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
      const initialState = [file1Modified, file2];
      const newState = fileSlice(initialState, removeAllModifiedFiles());
      expect(newState).toEqual([file2]);
    });

    it('should handle deleteFile', () => {
      const initialState = [file1, file2];
      const newState = fileSlice(initialState, deleteFile('fileName1'));
      expect(newState).toEqual([file2]);
    });

    it('should handle removeAllCreationFiles', () => {
      const initialState = [file1, file2];
      const newState = fileSlice(initialState, removeAllCreationFiles());
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

      const initialState = [file1, file2, descriptionFile];
      const newState = fileSlice(initialState, removeAllCreationFiles());
      expect(newState).toEqual([descriptionFileAfterUpdate]);
    });

    it('should handle removeAllFiles', () => {
      const initialState = [file1, file2];
      const newState = fileSlice(initialState, removeAllFiles());
      expect(newState).toEqual([]);
    });
  });

  describe('cart reducer', () => {
    const asset1 = mockLibraryAsset;
    const asset2 = { ...mockLibraryAsset, path: 'path2' };

    it('should handle addToCart', () => {
      const newState = cartSlice(initialState.cart, addToCart(asset1));
      expect(newState.assets).toEqual([asset1]);
    });

    it('should not add duplicate assets to cart', () => {
      initialState.cart.assets = [asset1];
      const newState = cartSlice(initialState.cart, addToCart(asset1));
      expect(newState.assets).toEqual([asset1]);
    });

    it('should handle removeFromCart', () => {
      initialState.cart.assets = [asset1, asset2];
      const newState = cartSlice(initialState.cart, removeFromCart(asset1));
      expect(newState.assets).toEqual([asset2]);
    });

    it('should handle clearCart', () => {
      initialState.cart.assets = [asset1, asset2];
      const newState = cartSlice(initialState.cart, clearCart());
      expect(newState.assets).toEqual([]);
    });
  });

  describe('libraryFilesSlice', () => {
    const initialState: LibraryConfigFile[] = [];

    it('should handle initial state', () => {
      expect(libraryFilesSlice(undefined, { type: 'unknown' })).toEqual(
        initialState,
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
        initialState,
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
});
