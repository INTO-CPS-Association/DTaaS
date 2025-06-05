import { combineReducers, configureStore, createStore } from '@reduxjs/toolkit';
import digitalTwinReducer, {
  setDigitalTwin,
} from 'preview/store/digitalTwin.slice';
import fileSlice, { addOrUpdateFile } from 'preview/store/file.slice';
import Sidebar from 'preview/route/digitaltwins/editor/Sidebar';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import * as React from 'react';
import {
  mockBackendInstance,
  mockLibraryAsset,
} from 'test/preview/__mocks__/global_mocks';
import DigitalTwin from 'preview/util/digitalTwin';
import * as SidebarFunctions from 'preview/route/digitaltwins/editor/sidebarFunctions';
import cartSlice, { addToCart } from 'preview/store/cart.slice';

describe('Sidebar', () => {
  const setFileNameMock = jest.fn();
  const setFileContentMock = jest.fn();
  const setFileTypeMock = jest.fn();
  const setFilePrivacyMock = jest.fn();
  const setIsLibraryFileMock = jest.fn();
  const setLibraryAssetPathMock = jest.fn();

  let store: ReturnType<typeof createStore>;
  let digitalTwin: DigitalTwin;

  const setupDigitalTwin = (assetName: string) => {
    digitalTwin = new DigitalTwin(assetName, mockBackendInstance);
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

  const clickFileType = async (type: string) => {
    const node = screen.getByText(type);
    await act(async () => {
      fireEvent.click(node);
    });

    await waitFor(() => {
      expect(screen.queryByRole('circular-progress')).not.toBeInTheDocument();
    });
  };

  const testFileClick = async (
    type: string,
    expectedFileNames: string[],
    mockContent: string,
  ) => {
    await clickFileType(type);
    digitalTwin.DTAssets.getFileContent = jest
      .fn()
      .mockResolvedValue(mockContent);

    await waitFor(async () => {
      expectedFileNames.forEach((fileName) => {
        expect(screen.getByText(fileName)).toBeInTheDocument();
      });
    });

    const fileToClick = screen.getByText(expectedFileNames[0]);
    await act(async () => {
      fireEvent.click(fileToClick);
    });

    await waitFor(() => {
      expect(setFileNameMock).toHaveBeenCalledWith(expectedFileNames[0]);
    });
  };

  const performFileTests = async () => {
    await testFileClick(
      'Description',
      ['file1.md', 'file2.md'],
      'file 1 content',
    );
    await testFileClick(
      'Configuration',
      ['config1.json', 'config2.json'],
      'config 1 content',
    );
    await testFileClick(
      'Lifecycle',
      ['lifecycle1.txt', 'lifecycle2.txt'],
      'lifecycle 1 content',
    );
  };

  beforeEach(async () => {
    store = configureStore({
      reducer: combineReducers({
        cart: cartSlice,
        digitalTwin: digitalTwinReducer,
        files: fileSlice,
      }),
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: false,
        }),
    });

    store.dispatch(addToCart(mockLibraryAsset));

    const files = [
      { name: 'Asset 1', content: 'content1', isNew: false, isModified: false },
    ];
    store.dispatch(addOrUpdateFile(files[0]));

    setupDigitalTwin('Asset 1');

    store.dispatch(setDigitalTwin({ assetName: 'Asset 1', digitalTwin }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls handleFileClick when a file type is clicked', async () => {
    await act(async () => {
      render(
        <Provider store={store}>
          <Sidebar
            name={'Asset 1'}
            setFileName={setFileNameMock}
            setFileContent={setFileContentMock}
            setFileType={setFileTypeMock}
            setFilePrivacy={setFilePrivacyMock}
            setIsLibraryFile={setIsLibraryFileMock}
            setLibraryAssetPath={setLibraryAssetPathMock}
            tab={'reconfigure'}
            fileName="file1.md"
            isLibraryFile={false}
          />
        </Provider>,
      );
    });

    await performFileTests();
  });

  it('calls handle addFileCkick when add file is clicked', async () => {
    const handleAddFileClick = jest.spyOn(
      SidebarFunctions,
      'handleAddFileClick',
    );

    await act(async () => {
      render(
        <Provider store={store}>
          <Sidebar
            name={'Asset 1'}
            setFileName={setFileNameMock}
            setFileContent={setFileContentMock}
            setFileType={setFileTypeMock}
            setFilePrivacy={setFilePrivacyMock}
            setIsLibraryFile={setIsLibraryFileMock}
            setLibraryAssetPath={setLibraryAssetPathMock}
            tab={'create'}
            fileName="file1.md"
            isLibraryFile={false}
          />
        </Provider>,
      );
    });

    const addFile = screen.getByText('Add new file');
    await act(async () => {
      fireEvent.click(addFile);
    });

    await waitFor(() => {
      expect(handleAddFileClick).toHaveBeenCalled();
    });
  });

  it('should open the sidebar dialog when a new file is added', async () => {
    await act(async () => {
      render(
        <Provider store={store}>
          <Sidebar
            name={'Asset 1'}
            setFileName={setFileNameMock}
            setFileContent={setFileContentMock}
            setFileType={setFileTypeMock}
            setFilePrivacy={setFilePrivacyMock}
            setIsLibraryFile={setIsLibraryFileMock}
            setLibraryAssetPath={setLibraryAssetPathMock}
            tab={'create'}
            fileName="file1.md"
            isLibraryFile={false}
          />
        </Provider>,
      );
    });

    const addFile = screen.getByText('Add new file');
    act(() => {
      fireEvent.click(addFile);
    });

    waitFor(() => {
      expect(screen.getByText('Enter the file name')).toBeInTheDocument();
    });
  });

  it('renders file section when no digital twin is selected', async () => {
    await act(async () => {
      render(
        <Provider store={store}>
          <Sidebar
            name={''}
            setFileName={setFileNameMock}
            setFileContent={setFileContentMock}
            setFileType={setFileTypeMock}
            setFilePrivacy={setFilePrivacyMock}
            setIsLibraryFile={setIsLibraryFileMock}
            setLibraryAssetPath={setLibraryAssetPathMock}
            tab={'create'}
            fileName="file1.md"
            isLibraryFile={false}
          />
        </Provider>,
      );
    });

    const lifecycle = screen.getByText('Lifecycle');
    act(() => {
      fireEvent.click(lifecycle);
    });

    waitFor(() => {
      expect(screen.getByText('Asset 1')).toBeInTheDocument();
    });
  });
});
