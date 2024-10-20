import { AnyAction, Store, combineReducers, configureStore, getDefaultMiddleware } from "@reduxjs/toolkit";
import digitalTwinReducer, { setDigitalTwin } from "preview/store/digitalTwin.slice";
import fileSlice, { addOrUpdateFile } from "preview/store/file.slice";
import Sidebar from "preview/route/digitaltwins/editor/Sidebar";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import * as React from "react";
import { mockGitlabInstance } from "test/preview/__mocks__/global_mocks";
import DigitalTwin from "preview/util/gitlabDigitalTwin";

describe('Sidebar', () => {
  let setFileNameMock: jest.Mock<any, any, any>;
  let setFileContentMock;
  let setFileTypeMock;
  let store: Store<any, AnyAction>;

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

      const digitalTwin = new DigitalTwin('Asset 1', mockGitlabInstance);
      digitalTwin.getDescriptionFiles = jest.fn().mockResolvedValue(['file1.md', 'file2.md']);
      digitalTwin.configFiles = ['config1.json', 'config2.json'];
      digitalTwin.lifecycleFiles = ['lifecycle1.txt', 'lifecycle2.txt'];
      const files = [{ name: 'Asset 1', content: 'content1', isModified: false }];

      store.dispatch(
        setDigitalTwin({
          assetName: 'Asset 1',
          digitalTwin,
        }),
      );
      store.dispatch(addOrUpdateFile(files[0]));

      setFileNameMock = jest.fn();
      setFileContentMock = jest.fn();
      setFileTypeMock = jest.fn();

      render(
        <Provider store={store}>
          <Sidebar
            name={'Asset 1'}
            setFileName={setFileNameMock}
            setFileContent={setFileContentMock}
            setFileType={setFileTypeMock}
          />
        </Provider>
      );
    });
  });
  
    afterEach(() => {
      jest.clearAllMocks();
    });
  
    it('calls handleFileClick when a description file is clicked', async () => {
      const digitalTwin = new DigitalTwin('Asset 1', mockGitlabInstance);
      digitalTwin.descriptionFiles = ['file1.md', 'file2.md'];
      digitalTwin.configFiles = ['config1.json', 'config2.json'];
      digitalTwin.lifecycleFiles = ['lifecycle1.txt', 'lifecycle2.txt'];

      React.act(() => {
        store.dispatch(
        setDigitalTwin({
          assetName: 'Asset 1',
          digitalTwin,
        }),
      );
    });

      await waitFor(() => {
        digitalTwin.getFileContent = jest.fn().mockResolvedValue('file 1 content');

        expect(screen.queryByRole('circular-progress')).not.toBeInTheDocument();
      });

      const descriptionNode = screen.getByText('Description');
      fireEvent.click(descriptionNode);
  
      await waitFor(() => {
        expect(screen.getByText('file1.md')).toBeInTheDocument();
        expect(screen.getByText('file2.md')).toBeInTheDocument();
      });
  
      const file = screen.getByText('file1.md');
      fireEvent.click(file);
  
      await waitFor(() => {
        expect(setFileNameMock).toHaveBeenCalledWith('file1.md');
      });
    });

  it('calls handleFileClick when a configuration file is clicked', async () => {
    const digitalTwin = new DigitalTwin('Asset 1', mockGitlabInstance);
    digitalTwin.descriptionFiles = ['file1.md', 'file2.md'];
    digitalTwin.configFiles = ['config1.json', 'config2.json'];
    digitalTwin.lifecycleFiles = ['lifecycle1.txt', 'lifecycle2.txt'];

    React.act(() => {
      store.dispatch(
      setDigitalTwin({
        assetName: 'Asset 1',
        digitalTwin,
      }),
    );
  });

    await waitFor(() => {
      digitalTwin.getFileContent = jest.fn().mockResolvedValue('config 1 content');

      expect(screen.queryByRole('circular-progress')).not.toBeInTheDocument();
    });


    const descriptionNode = screen.getByText('Configuration');
    fireEvent.click(descriptionNode);

    await waitFor(() => {
      expect(screen.getByText('config1.json')).toBeInTheDocument();
      expect(screen.getByText('config2.json')).toBeInTheDocument();
    });

    const file = screen.getByText('config1.json');
    fireEvent.click(file);

    await waitFor(() => {
      expect(setFileNameMock).toHaveBeenCalledWith('config1.json');
    });
  });

  it('calls handleFileClick when a lifecycle file is clicked', async () => {
    const digitalTwin = new DigitalTwin('Asset 1', mockGitlabInstance);
    digitalTwin.descriptionFiles = ['file1.md', 'file2.md'];
    digitalTwin.configFiles = ['config1.json', 'config2.json'];
    digitalTwin.lifecycleFiles = ['lifecycle1.txt', 'lifecycle2.txt'];

    React.act(() => {
      store.dispatch(
      setDigitalTwin({
        assetName: 'Asset 1',
        digitalTwin,
      }),
    );
  });

    await waitFor(() => {
      digitalTwin.getFileContent = jest.fn().mockResolvedValue('lifecycle 1 content');

      expect(screen.queryByRole('circular-progress')).not.toBeInTheDocument();
    });


    const descriptionNode = screen.getByText('Lifecycle');
    fireEvent.click(descriptionNode);

    await waitFor(() => {
      expect(screen.getByText('lifecycle1.txt')).toBeInTheDocument();
      expect(screen.getByText('lifecycle2.txt')).toBeInTheDocument();
    });

    const file = screen.getByText('lifecycle1.txt');
    fireEvent.click(file);

    await waitFor(() => {
      expect(setFileNameMock).toHaveBeenCalledWith('lifecycle1.txt');
    });
  });
});
