import Editor from 'preview/route/digitaltwins/editor/Editor';
import { act, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import assetsReducer, { setAssets } from 'preview/store/assets.slice';
import digitalTwinReducer, {
  setDigitalTwin,
} from 'preview/store/digitalTwin.slice';
import fileSlice, {
  FileState,
  addOrUpdateFile,
} from 'preview/store/file.slice';
import { Asset } from 'preview/components/asset/Asset';
import * as React from 'react';
import DigitalTwin from 'preview/util/digitalTwin';
import { mockGitlabInstance } from 'test/preview/__mocks__/global_mocks';
import { handleFileClick } from 'preview/route/digitaltwins/editor/sidebarFunctions';

describe('Editor', () => {
  const fileName = 'file1.md';
  const fileContent = 'content1';
  const fileType = 'md';
  const setFileName = jest.fn();
  const setFileContent = jest.fn();
  const setFileType = jest.fn();

  const preSetItems: Asset[] = [{ name: 'Asset 1', path: 'path/asset1' }];
  const files = [
    { name: 'file1.md', content: 'content1', isNew: false, isModified: false },
  ];

  const store = configureStore({
    reducer: combineReducers({
      assets: assetsReducer,
      digitalTwin: digitalTwinReducer,
      files: fileSlice,
    }),
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  });

  const digitalTwinInstance = new DigitalTwin('Asset 1', mockGitlabInstance);
  digitalTwinInstance.descriptionFiles = ['file1.md', 'file2.md'];
  digitalTwinInstance.configFiles = ['config1.json', 'config2.json'];
  digitalTwinInstance.lifecycleFiles = ['lifecycle1.txt', 'lifecycle2.txt'];

  const setupTest = async () => {
    store.dispatch(setAssets(preSetItems));
    await act(async () => {
      store.dispatch(
        setDigitalTwin({
          assetName: 'Asset 1',
          digitalTwin: digitalTwinInstance,
        }),
      );
      store.dispatch(addOrUpdateFile(files[0]));
    });
  };

  const dispatchSetDigitalTwin = async (digitalTwin: DigitalTwin) => {
    await act(async () => {
      store.dispatch(
        setDigitalTwin({
          assetName: 'Asset 1',
          digitalTwin,
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
            />
          </Provider>,
        );
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
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

    const newDigitalTwin = new DigitalTwin('Asset 1', mockGitlabInstance);

    await dispatchSetDigitalTwin(newDigitalTwin);

    await act(async () => {
      await handleFileClick(
        'file1.md',
        newDigitalTwin,
        setFileName,
        setFileContent,
        setFileType,
        modifiedFiles,
        'reconfigure',
      );
    });

    expect(setFileName).toHaveBeenCalledWith('file1.md');
    expect(setFileContent).toHaveBeenCalledWith('modified content');
    expect(setFileType).toHaveBeenCalledWith('md');
  });

  it('should fetch file content for an unmodified file', async () => {
    const modifiedFiles: FileState[] = [];

    const newDigitalTwin = new DigitalTwin('Asset 1', mockGitlabInstance);
    newDigitalTwin.fileHandler.getFileContent = jest
      .fn()
      .mockResolvedValueOnce('Fetched content');

    await dispatchSetDigitalTwin(newDigitalTwin);

    await act(async () => {
      await handleFileClick(
        'file1.md',
        newDigitalTwin,
        setFileName,
        setFileContent,
        setFileType,
        modifiedFiles,
        'reconfigure',
      );
    });

    expect(setFileName).toHaveBeenCalledWith('file1.md');
    expect(setFileContent).toHaveBeenCalledWith('Fetched content');
    expect(setFileType).toHaveBeenCalledWith('md');
  });

  it('should set error message when fetching file content fails', async () => {
    const modifiedFiles: FileState[] = [];

    const newDigitalTwin = new DigitalTwin('Asset 1', mockGitlabInstance);
    newDigitalTwin.fileHandler.getFileContent = jest
      .fn()
      .mockRejectedValueOnce(new Error('Fetch error'));

    await dispatchSetDigitalTwin(newDigitalTwin);

    await React.act(async () => {
      await handleFileClick(
        'file1.md',
        newDigitalTwin,
        setFileName,
        setFileContent,
        setFileType,
        modifiedFiles,
        'reconfigure',
      );
    });

    expect(setFileContent).toHaveBeenCalledWith(
      'Error fetching file1.md content',
    );
  });
});
