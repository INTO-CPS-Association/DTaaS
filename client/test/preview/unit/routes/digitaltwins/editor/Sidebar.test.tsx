import { render, waitFor, screen, act } from '@testing-library/react';
import Sidebar from 'preview/route/digitaltwins/editor/Sidebar';
import * as SidebarFunctions from 'preview/route/digitaltwins/editor/sidebarFunctions';
import { Provider, useSelector } from 'react-redux';
import store, { RootState } from 'store/store';
import {
  mockDigitalTwin,
  mockLibraryAsset,
} from 'test/preview/__mocks__/global_mocks';
import { addOrUpdateLibraryFile } from 'preview/store/libraryConfigFiles.slice';
import * as ReactRedux from 'react-redux';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

describe('Sidebar', () => {
  const setFileName = jest.fn();
  const setFileContent = jest.fn();
  const setFileType = jest.fn();
  const setFilePrivacy = jest.fn();
  const setIsLibraryFile = jest.fn();
  const setLibraryAssetPath = jest.fn();
  const fileName = 'testFile.md';
  const isLibraryFile = false;

  const renderSidebar = async (tab: string, name?: string) => {
    await act(async () => {
      render(
        <Provider store={store}>
          <Sidebar
            name={name}
            setFileName={setFileName}
            setFileContent={setFileContent}
            setFileType={setFileType}
            setFilePrivacy={setFilePrivacy}
            setIsLibraryFile={setIsLibraryFile}
            setLibraryAssetPath={setLibraryAssetPath}
            tab={tab}
            fileName={fileName}
            isLibraryFile={isLibraryFile}
          />
        </Provider>,
      );
    });
  };

  beforeEach(() => {
    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      (selector: (state: RootState) => unknown) => {
        if (selector.toString().includes('state.files')) {
          return [];
        }
        if (selector.toString().includes('state.cart.assets')) {
          return [mockLibraryAsset];
        }
        return mockDigitalTwin;
      },
    );
  });

  it('renders Sidebar', async () => {
    await renderSidebar('reconfigure', 'mockedDTName');

    await waitFor(() => {
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Lifecycle')).toBeInTheDocument();
      expect(screen.getByText('Configuration')).toBeInTheDocument();
    });
  });

  it('should call handleAddFileClick when Add new file button is clicked', async () => {
    const handleAddFileClickSpy = jest.spyOn(
      SidebarFunctions,
      'handleAddFileClick',
    );

    await renderSidebar('create', 'mockedDTName');

    await waitFor(() => {
      const addFileButton = screen.getByText('Add new file');
      addFileButton.click();
    });

    expect(handleAddFileClickSpy).toHaveBeenCalled();
  });

  it('should render file sections', async () => {
    await renderSidebar('reconfigure', 'differentDTName');

    await waitFor(() => {
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Lifecycle')).toBeInTheDocument();
      expect(screen.getByText('Configuration')).toBeInTheDocument();
      // From mockDigitalTwin.assetFiles
      expect(screen.getByText('assetPath configuration')).toBeInTheDocument();
    });
  });

  it('handles assets in create mode', async () => {
    const addOrUpdateLibraryFileSpy = jest.spyOn(ReactRedux, 'useDispatch');

    await renderSidebar('create');

    await waitFor(() => {
      expect(addOrUpdateLibraryFileSpy).toHaveBeenCalled();
      mockLibraryAsset.configFiles.forEach((file) => {
        expect(addOrUpdateLibraryFileSpy).toHaveBeenCalledWith(
          addOrUpdateLibraryFile({
            assetPath: mockLibraryAsset.path,
            fileName: file,
            fileContent: '',
            isNew: true,
            isModified: false,
            isPrivate: mockLibraryAsset.isPrivate,
          }),
        );
      });
    });
  });
});
