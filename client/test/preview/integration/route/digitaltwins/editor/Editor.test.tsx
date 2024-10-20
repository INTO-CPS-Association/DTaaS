import Editor from 'preview/route/digitaltwins/editor/Editor';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import {
  combineReducers,
  configureStore,
  getDefaultMiddleware,
} from '@reduxjs/toolkit';
import assetsReducer, { setAssets } from 'preview/store/assets.slice';
import digitalTwinReducer, { setDigitalTwin } from 'preview/store/digitalTwin.slice';
import snackbarSlice from 'preview/store/snackbar.slice';
import fileSlice, { FileState, addOrUpdateFile } from 'preview/store/file.slice';
import { Asset } from 'preview/components/asset/Asset';
import * as React from 'react';
import DigitalTwin from 'preview/util/gitlabDigitalTwin';
import { mockGitlabInstance } from 'test/preview/__mocks__/global_mocks';
import { handleFileClick } from 'preview/route/digitaltwins/editor/Sidebar';
describe('Editor', () => {
  const preSetItems: Asset[] = [{ name: 'Asset 1', path: 'path/asset1' }];

  const files = [{ name: 'Asset 1', content: 'content1', isModified: false }];

  const store = configureStore({
    reducer: combineReducers({
      assets: assetsReducer,
      digitalTwin: digitalTwinReducer,
      snackbar: snackbarSlice,
      files: fileSlice,
    }),
    middleware: getDefaultMiddleware({
      serializableCheck: false,
    }),
  });

  const digitalTwin = new DigitalTwin('Asset 1', mockGitlabInstance);
  digitalTwin.descriptionFiles = ['file1.md', 'file2.md'];
  digitalTwin.configFiles = ['config1.json', 'config2.json'];
  digitalTwin.lifecycleFiles = ['lifecycle1.txt', 'lifecycle2.txt'];

  const setupTest = async () => {
    store.dispatch(setAssets(preSetItems));
    store.dispatch(
      setDigitalTwin({
        assetName: 'Asset 1',
        digitalTwin,
      }),
    );
    store.dispatch(addOrUpdateFile(files[0]));
  };

  beforeEach(async () => {
    setupTest();

    await React.act(async () => {
      await waitFor(() => {
        render(
          <Provider store={store}>
            <Editor DTName={'Asset 1'} />
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

    React.act(() => {
      previewTab.click();
    });

    expect(previewTab).toHaveAttribute('aria-selected', 'true');
    expect(editorTab).toHaveAttribute('aria-selected', 'false');
  });

  it('should update state when a modified file is clicked', async () => {
    const setFileName = jest.fn();
    const setFileContent = jest.fn();
    const setFileType = jest.fn();
    
    const modifiedFiles = [{ name: 'file1.md', content: 'modified content', isModified: true }];
    
    const digitalTwin = new DigitalTwin('Asset 1', mockGitlabInstance);
    await React.act(async () => {
        store.dispatch(
            setDigitalTwin({
                assetName: 'Asset 1',
                digitalTwin: digitalTwin,
            })
        );

        await handleFileClick('file1.md', digitalTwin, setFileName, setFileContent, setFileType, modifiedFiles);
    });

    expect(setFileName).toHaveBeenCalledWith('file1.md');
    expect(setFileContent).toHaveBeenCalledWith('modified content');
    expect(setFileType).toHaveBeenCalledWith('md');
  });

  it('should fetch file content for an unmodified file', async () => {
    const setFileName = jest.fn();
    const setFileContent = jest.fn();
    const setFileType = jest.fn();
    
    const modifiedFiles: FileState[] = [];

    const digitalTwin = new DigitalTwin('Asset 1', mockGitlabInstance);
    digitalTwin.getFileContent = jest.fn().mockResolvedValueOnce('Fetched content');
    
    await React.act(async () => {
      store.dispatch(
        setDigitalTwin({
            assetName: 'Asset 1',
            digitalTwin: digitalTwin,
        })
    );
      await handleFileClick('file1.md', digitalTwin, setFileName, setFileContent, setFileType, modifiedFiles);
  });

    expect(setFileName).toHaveBeenCalledWith('file1.md');
    expect(setFileContent).toHaveBeenCalledWith('Fetched content');
    expect(setFileType).toHaveBeenCalledWith('md');
});

it('should set error message when fetching file content fails', async () => {
  const setFileName = jest.fn();
  const setFileContent = jest.fn();
  const setFileType = jest.fn();
  
  const modifiedFiles: FileState[] = [];

  const digitalTwin = new DigitalTwin('Asset 1', mockGitlabInstance);
  digitalTwin.getFileContent = jest.fn().mockResolvedValueOnce(null);
  
  await React.act(async () => {
    store.dispatch(
      setDigitalTwin({
          assetName: 'Asset 1',
          digitalTwin: digitalTwin,
      })
  );
  await handleFileClick('file1.md', digitalTwin, setFileName, setFileContent, setFileType, modifiedFiles);
});

  expect(setFileContent).toHaveBeenCalledWith('Error fetching file1.md content'); 
});
});