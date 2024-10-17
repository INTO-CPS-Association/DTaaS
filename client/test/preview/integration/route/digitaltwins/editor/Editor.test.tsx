import Editor from 'preview/route/digitaltwins/editor/Editor';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import {
  combineReducers,
  configureStore,
  getDefaultMiddleware,
} from '@reduxjs/toolkit';
import { mockGitlabInstance } from 'test/preview/__mocks__/global_mocks';
import assetsReducer, { setAssets } from 'preview/store/assets.slice';
import digitalTwinReducer, { setDigitalTwin } from 'preview/store/digitalTwin.slice';
import snackbarSlice from 'preview/store/snackbar.slice';
import fileSlice, { addOrUpdateFile } from 'preview/store/file.slice';
import { Asset } from 'preview/components/asset/Asset';
import * as React from 'react';
import DigitalTwin from 'preview/util/gitlabDigitalTwin';

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

  const setupTest = () => {
    store.dispatch(setAssets(preSetItems));
    store.dispatch(
      setDigitalTwin({
        assetName: 'Asset 1',
        digitalTwin,
      }),
    );
    store.dispatch(addOrUpdateFile(files[0]));
  };

  beforeEach(() => {
    setupTest();

    React.act(() => {
      render(
        <Provider store={store}>
          <Editor DTName={'Asset 1'} />
        </Provider>,
      );
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
});
