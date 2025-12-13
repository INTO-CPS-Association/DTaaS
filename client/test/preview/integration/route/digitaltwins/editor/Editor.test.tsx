import Editor from 'preview/route/digitaltwins/editor/Editor';
import { act, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import assetsReducer, { setAssets } from 'preview/store/assets.slice';
import digitalTwinReducer, {
  setDigitalTwin,
} from 'model/backend/state/digitalTwin.slice';
import { mockBackendInstance } from 'test/__mocks__/global_mocks';
import fileSlice, { addOrUpdateFile } from 'preview/store/file.slice';
import DigitalTwin from 'model/backend/digitalTwin';
import {
  mockLibraryAsset,
  createMockDigitalTwinData,
} from 'test/preview/__mocks__/global_mocks';
import { handleFileClick } from 'preview/route/digitaltwins/editor/sidebarFunctions';
import LibraryAsset from 'model/backend/libraryAsset';
import cartSlice, { addToCart } from 'preview/store/cart.slice';
import { FileState } from 'model/backend/interfaces/sharedInterfaces';

describe('Editor', () => {
  const fileName = 'file1.md';
  const fileContent = 'content1';
  const fileType = 'md';
  const setFileName = jest.fn();
  const setFileContent = jest.fn();
  const setFileType = jest.fn();
  const setFilePrivacy = jest.fn();
  const setIsLibraryFile = jest.fn();
  const setLibraryAssetPath = jest.fn();

  const preSetItems: LibraryAsset[] = [mockLibraryAsset];
  const files = [
    { name: 'file1.md', content: 'content1', isNew: false, isModified: false },
  ];

  const store = configureStore({
    reducer: combineReducers({
      assets: assetsReducer,
      digitalTwin: digitalTwinReducer,
      files: fileSlice,
      cart: cartSlice,
    }),
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  });

  const digitalTwinData = createMockDigitalTwinData('Asset 1');

  async function clickMockFiles(
    modifiedFiles: FileState[],
    newDigitalTwinData: DigitalTwin,
  ): Promise<void> {
    await act(async () => {
      await handleFileClick(
        'file1.md',
        newDigitalTwinData,
        setFileName,
        setFileContent,
        setFileType,
        setFilePrivacy,
        modifiedFiles,
        'reconfigure',
        setIsLibraryFile,
        setLibraryAssetPath,
      );
    });
  }

  async function makeMockDTInstance(overrides?: {
    DTAssets?: Partial<DigitalTwin['DTAssets']>;
  }) {
    const newDigitalTwinData = createMockDigitalTwinData('Asset 1');
    await dispatchSetDigitalTwin(newDigitalTwinData);
    const digitalTwinInstance = new DigitalTwin('Asset 1', mockBackendInstance);

    if (overrides?.DTAssets) {
      Object.assign(digitalTwinInstance.DTAssets, overrides.DTAssets);
    }

    return digitalTwinInstance;
  }

  const setupTest = async () => {
    store.dispatch(addToCart(mockLibraryAsset));
    store.dispatch(setAssets(preSetItems));
    await act(async () => {
      store.dispatch(
        setDigitalTwin({
          assetName: 'Asset 1',
          digitalTwin: digitalTwinData,
        }),
      );
      store.dispatch(addOrUpdateFile(files[0]));
    });
  };

  const dispatchSetDigitalTwin = async (
    dtData: ReturnType<typeof createMockDigitalTwinData>,
  ) => {
    await act(async () => {
      store.dispatch(
        setDigitalTwin({
          assetName: 'Asset 1',
          digitalTwin: dtData,
        }),
      );
    });
  };

  beforeEach(async () => {
    await setupTest();
    await act(async () => {
      await waitFor(() => {
        render(
          <Provider store={store}>
            <Editor
              DTName={'Asset 1'}
              tab="reconfigure"
              fileName={fileName}
              setFileName={setFileName}
              fileContent={fileContent}
              setFileContent={setFileContent}
              fileType={fileType}
              setFileType={setFileType}
              filePrivacy={'private'}
              setFilePrivacy={setFilePrivacy}
              isLibraryFile={false}
              setIsLibraryFile={setIsLibraryFile}
              libraryAssetPath={''}
              setLibraryAssetPath={setLibraryAssetPath}
            />
          </Provider>,
        );
      });
    });
  });

  it('changes active tab', () => {
    const editorTab = screen.getByRole('tab', { name: 'Editor' });
    const previewTab = screen.getByRole('tab', { name: 'Preview' });

    expect(editorTab).toHaveAttribute('aria-selected', 'true');
    expect(previewTab).toHaveAttribute('aria-selected', 'false');

    act(() => {
      previewTab.click();
    });

    expect(previewTab).toHaveAttribute('aria-selected', 'true');
    expect(editorTab).toHaveAttribute('aria-selected', 'false');
  });

  it('should update state when a modified file is clicked', async () => {
    const modifiedFiles = [
      {
        name: 'file1.md',
        content: 'modified content',
        isNew: false,
        isModified: true,
      },
    ];

    const digitalTwinInstance = await makeMockDTInstance();
    await clickMockFiles(modifiedFiles, digitalTwinInstance);

    expect(setFileName).toHaveBeenCalledWith('file1.md');
    expect(setFileContent).toHaveBeenCalledWith('modified content');
    expect(setFileType).toHaveBeenCalledWith('md');
  });

  it('should fetch file content for an unmodified file', async () => {
    const modifiedFiles: FileState[] = [];
    const digitalTwinInstance = await makeMockDTInstance({
      DTAssets: {
        getFileContent: jest.fn().mockResolvedValueOnce('Fetched content'),
      },
    });

    await clickMockFiles(modifiedFiles, digitalTwinInstance);

    expect(setFileName).toHaveBeenCalledWith('file1.md');
    expect(setFileContent).toHaveBeenCalledWith('Fetched content');
    expect(setFileType).toHaveBeenCalledWith('md');
  });

  it('should set error message when fetching file content fails', async () => {
    const modifiedFiles: FileState[] = [];

    const digitalTwinInstance = await makeMockDTInstance({
      DTAssets: {
        getFileContent: jest
          .fn()
          .mockRejectedValueOnce(new Error('Fetch error')),
      },
    });
    await clickMockFiles(modifiedFiles, digitalTwinInstance);

    expect(setFileContent).toHaveBeenCalledWith(
      'Error fetching file1.md content',
    );
  });
});
