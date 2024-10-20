import {
  combineReducers,
  configureStore,
  createStore,
  getDefaultMiddleware,
} from '@reduxjs/toolkit';
import digitalTwinReducer, {
  setDigitalTwin,
} from 'preview/store/digitalTwin.slice';
import fileSlice, { addOrUpdateFile } from 'preview/store/file.slice';
import Sidebar from 'preview/route/digitaltwins/editor/Sidebar';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import * as React from 'react';
import { mockGitlabInstance } from 'test/preview/__mocks__/global_mocks';
import DigitalTwin from 'preview/util/gitlabDigitalTwin';

describe('Sidebar', () => {
  const setFileNameMock = jest.fn();
  const setFileContentMock = jest.fn();
  const setFileTypeMock = jest.fn();

  let store: ReturnType<typeof createStore>;
  let digitalTwin: DigitalTwin;

  const setupDigitalTwin = (assetName: string) => {
    digitalTwin = new DigitalTwin(assetName, mockGitlabInstance);
    digitalTwin.descriptionFiles = ['file1.md', 'file2.md'];
    digitalTwin.configFiles = ['config1.json', 'config2.json'];
    digitalTwin.lifecycleFiles = ['lifecycle1.txt', 'lifecycle2.txt'];
    digitalTwin.getDescriptionFiles = jest
      .fn()
      .mockResolvedValue(digitalTwin.descriptionFiles);
    digitalTwin.getConfigFiles = jest
      .fn()
      .mockResolvedValue(digitalTwin.configFiles);
    digitalTwin.getLifecycleFiles = jest
      .fn()
      .mockResolvedValue(digitalTwin.lifecycleFiles);
  };

  const clickFileType = async (
    type: 'Description' | 'Configuration' | 'Lifecycle',
    mockContent: string,
  ) => {
    const node = screen.getByText(type);
    fireEvent.click(node);

    await waitFor(() => {
      expect(screen.queryByRole('circular-progress')).not.toBeInTheDocument();
    });

    digitalTwin.getFileContent = jest.fn().mockResolvedValue(mockContent);
  };

  const testFileClick = async (
    type: 'Description' | 'Configuration' | 'Lifecycle',
    expectedFileNames: string[],
    mockContent: string,
  ) => {
    await clickFileType(type, mockContent);

    await waitFor(() => {
      expectedFileNames.forEach((fileName) => {
        expect(screen.getByText(fileName)).toBeInTheDocument();
      });
    });

    const fileToClick = screen.getByText(expectedFileNames[0]);
    fireEvent.click(fileToClick);

    await waitFor(() => {
      expect(setFileNameMock).toHaveBeenCalledWith(expectedFileNames[0]);
    });
  };

  beforeEach(async () => {
    await React.act(async () => {
      store = configureStore({
        reducer: combineReducers({
          digitalTwin: digitalTwinReducer,
          files: fileSlice,
        }),
        middleware: getDefaultMiddleware({
          serializableCheck: false,
        }),
      });

      const files = [
        { name: 'Asset 1', content: 'content1', isModified: false },
      ];
      store.dispatch(addOrUpdateFile(files[0]));

      setupDigitalTwin('Asset 1');

      store.dispatch(
        setDigitalTwin({
          assetName: 'Asset 1',
          digitalTwin,
        }),
      );

      render(
        <Provider store={store}>
          <Sidebar
            name={'Asset 1'}
            setFileName={setFileNameMock}
            setFileContent={setFileContentMock}
            setFileType={setFileTypeMock}
          />
        </Provider>,
      );
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls handleFileClick when a description file is clicked', async () => {
    await testFileClick(
      'Description',
      ['file1.md', 'file2.md'],
      'file 1 content',
    );
  });

  it('calls handleFileClick when a configuration file is clicked', async () => {
    await testFileClick(
      'Configuration',
      ['config1.json', 'config2.json'],
      'config 1 content',
    );
  });

  it('calls handleFileClick when a lifecycle file is clicked', async () => {
    await testFileClick(
      'Lifecycle',
      ['lifecycle1.txt', 'lifecycle2.txt'],
      'lifecycle 1 content',
    );
  });
});
