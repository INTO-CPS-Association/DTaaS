/* eslint-disable import/first */
const ASSET_NAME = 'Asset 1';
const descriptionFiles = ['file1.md', 'file2.md'];
const configFiles = ['config1.json', 'config2.json'];
const lifecycleFiles = ['lifecycle1.txt', 'lifecycle2.txt'];

const digitalTwinDataMock = {
  DTName: ASSET_NAME,
  descriptionFiles,
  configFiles,
  lifecycleFiles,
  assetFiles: [],
  getDescriptionFiles: jest.fn().mockResolvedValue(descriptionFiles),
  getConfigFiles: jest.fn().mockResolvedValue(configFiles),
  getLifecycleFiles: jest.fn().mockResolvedValue(lifecycleFiles),
  DTAssets: {
    getFileContent: jest.fn().mockResolvedValue('mock file content'),
  },
};

jest.mock('preview/route/digitaltwins/editor/sidebarFetchers', () => ({
  fetchData: jest.fn().mockResolvedValue(undefined),
}));

const setOpenDeleteFileDialogMock = jest.fn();
const setOpenChangeFileNameDialogMock = jest.fn();

import { combineReducers, configureStore } from '@reduxjs/toolkit';
import digitalTwinReducer, {
  setDigitalTwin,
} from 'model/backend/state/digitalTwin.slice';
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
import {
  mockLibraryAsset,
  createMockDigitalTwinData,
} from 'test/preview/__mocks__/global_mocks';
import { mockBackendInstance } from 'test/__mocks__/global_mocks';
import DigitalTwin from 'model/backend/digitalTwin';
import * as SidebarFunctions from 'preview/route/digitaltwins/editor/sidebarFunctions';
import cartSlice, { addToCart } from 'preview/store/cart.slice';
import '@testing-library/jest-dom';
import libraryConfigFilesSlice from 'preview/store/libraryConfigFiles.slice';

jest.mock('model/backend/util/digitalTwinAdapter', () => ({
  createDigitalTwinFromData: jest.fn().mockResolvedValue(digitalTwinDataMock),
  extractDataFromDigitalTwin: jest.fn().mockReturnValue({
    DTName: ASSET_NAME,
    description: 'Test Digital Twin Description',
    jobLogs: [],
    pipelineCompleted: false,
    pipelineLoading: false,
    pipelineId: undefined,
    currentExecutionId: undefined,
    lastExecutionStatus: undefined,
    gitlabInstance: undefined,
  }),
}));

// Mock the init module to prevent real GitLab initialization
jest.mock('model/backend/util/init', () => ({
  initDigitalTwin: jest.fn().mockResolvedValue(digitalTwinDataMock),
}));

jest.mock('model/backend/gitlab/instance', () => ({
  GitlabInstance: jest.fn().mockImplementation(() => ({
    init: jest.fn().mockResolvedValue(undefined),
    getProjectId: jest.fn().mockResolvedValue(123),
    show: jest.fn().mockResolvedValue({}),
  })),
}));

describe('Sidebar', () => {
  const setFileNameMock = jest.fn();
  const setFileContentMock = jest.fn();
  const setFileTypeMock = jest.fn();
  const setFilePrivacyMock = jest.fn();
  const setIsLibraryFileMock = jest.fn();
  const setLibraryAssetPathMock = jest.fn();

  let store: ReturnType<typeof configureStore>;
  let digitalTwin: DigitalTwin;

  const setupDigitalTwin = (assetName: string) => {
    digitalTwin = new DigitalTwin(assetName, mockBackendInstance);
    digitalTwin.descriptionFiles = descriptionFiles;
    digitalTwin.configFiles = configFiles;
    digitalTwin.lifecycleFiles = lifecycleFiles;
    digitalTwin.getDescriptionFiles = jest
      .fn()
      .mockResolvedValue(digitalTwin.descriptionFiles);
    digitalTwin.getConfigFiles = jest
      .fn()
      .mockResolvedValue(digitalTwin.configFiles);
    digitalTwin.getLifecycleFiles = jest
      .fn()
      .mockResolvedValue(digitalTwin.lifecycleFiles);
    digitalTwin.assetFiles = [];
  };

  const renderSidebar = async (name: string, tab: string) => {
    await act(async () => {
      render(
        <Provider store={store}>
          <Sidebar
            name={name}
            setFileName={setFileNameMock}
            setFileContent={setFileContentMock}
            setFileType={setFileTypeMock}
            setFilePrivacy={setFilePrivacyMock}
            setIsLibraryFile={setIsLibraryFileMock}
            setLibraryAssetPath={setLibraryAssetPathMock}
            tab={tab}
            fileName="file1.md"
            isLibraryFile={false}
            setOpenDeleteFileDialog={setOpenDeleteFileDialogMock}
            setOpenChangeFileNameDialog={setOpenChangeFileNameDialogMock}
          />
        </Provider>,
      );
    });
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  };

  const clickAndWaitFor = async (buttonText: string, expectedText: string) => {
    const element = screen.getByText(buttonText);
    await act(async () => {
      fireEvent.click(element);
    });

    await waitFor(() => {
      expect(screen.getByText(expectedText)).toBeInTheDocument();
    });
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    store = configureStore({
      reducer: combineReducers({
        cart: cartSlice,
        digitalTwin: digitalTwinReducer,
        files: fileSlice,
        libraryConfigFiles: libraryConfigFilesSlice,
      }),
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: false,
        }),
    });

    const mockAsset = {
      ...mockLibraryAsset,
      configFiles: ['config1.json'],
      getConfigFiles: jest.fn().mockImplementation(async () => []),
    };

    store.dispatch(addToCart(mockAsset));

    const files = [
      {
        name: ASSET_NAME,
        content: 'content1',
        isNew: false,
        isModified: false,
      },
    ];
    store.dispatch(addOrUpdateFile(files[0]));

    setupDigitalTwin(ASSET_NAME);

    const digitalTwinData = createMockDigitalTwinData(ASSET_NAME);
    store.dispatch(
      setDigitalTwin({ assetName: ASSET_NAME, digitalTwin: digitalTwinData }),
    );
  });

  it('calls handleFileClick when a file type is clicked', async () => {
    await renderSidebar(ASSET_NAME, 'reconfigure');

    await waitFor(() => {
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Configuration')).toBeInTheDocument();
      expect(screen.getByText('Lifecycle')).toBeInTheDocument();
    });

    await clickAndWaitFor('Description', 'Description');
  });

  it('calls handle addFileCkick when add file is clicked', async () => {
    const handleAddFileClick = jest.spyOn(
      SidebarFunctions,
      'handleAddFileClick',
    );

    await renderSidebar(ASSET_NAME, 'create');

    const addFile = screen.getByText('Add new file');
    await act(async () => {
      fireEvent.click(addFile);
    });

    await waitFor(() => {
      expect(handleAddFileClick).toHaveBeenCalled();
    });
  });

  it('should open the sidebar dialog when a new file is added', async () => {
    jest
      .spyOn(SidebarFunctions, 'handleAddFileClick')
      .mockImplementation((setIsFileNameDialogOpen) => {
        setIsFileNameDialogOpen(true);
      });

    await renderSidebar(ASSET_NAME, 'create');

    const addFileButton = screen.getByText('Add new file');

    await act(async () => {
      fireEvent.click(addFileButton);
    });

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('renders file section when no digital twin is selected', async () => {
    await renderSidebar('', 'create');

    await waitFor(() => {
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Configuration')).toBeInTheDocument();
      expect(screen.getByText('Lifecycle')).toBeInTheDocument();
      expect(screen.getByText('Asset 1 configuration')).toBeInTheDocument();
    });
  });
});
