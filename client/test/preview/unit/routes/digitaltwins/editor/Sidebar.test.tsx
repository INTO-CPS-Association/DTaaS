import {
  render,
  waitFor,
  screen,
  act,
  fireEvent,
} from '@testing-library/react';
import Sidebar from 'preview/route/digitaltwins/editor/Sidebar';
import { handleReconfigureFileClick } from 'preview/route/digitaltwins/editor/sidebarFunctions';
import { selectDigitalTwinByName } from 'preview/store/digitalTwin.slice';
import { FileState } from 'preview/store/file.slice';
import * as React from 'react';
import { Provider, useSelector } from 'react-redux';
import store, { RootState } from 'store/store';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

describe('Sidebar', () => {
  const setFileName = jest.fn();
  const setFileContent = jest.fn();
  const setFileType = jest.fn();

  const renderSidebar = async (tab: string, name?: string) => {
    await act(async () => {
      render(
        <Provider store={store}>
          <Sidebar
            name={name}
            setFileName={setFileName}
            setFileContent={setFileContent}
            setFileType={setFileType}
            tab={tab}
          />
        </Provider>,
      );
    });
  };

  beforeEach(async () => {
    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      (selector: (state: RootState) => unknown) => {
        if (selector === selectDigitalTwinByName('mockedDTName')) {
          return mockDigitalTwin;
        }
        if (selector.toString().includes('state.files')) {
          return [];
        }
        return mockDigitalTwin;
      },
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders Sidebar', async () => {
    await renderSidebar('reconfigure', 'mockedDTName');

    await waitFor(() => {
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Lifecycle')).toBeInTheDocument();
      expect(screen.getByText('Configuration')).toBeInTheDocument();
    });
  });

  it('should update file state if the file is modified', async () => {
    await renderSidebar('reconfigure', 'mockedDTName');

    const modifiedFiles: FileState[] = [
      {
        name: 'testFile.md',
        content: 'modified content',
        isNew: false,
        isModified: true,
      },
    ];

    await act(async () => {
      handleReconfigureFileClick(
        'testFile.md',
        mockDigitalTwin,
        modifiedFiles,
        setFileName,
        setFileContent,
        setFileType,
      );
    });

    expect(setFileName).toHaveBeenCalledWith('testFile.md');
    expect(setFileContent).toHaveBeenCalledWith('modified content');
    expect(setFileType).toHaveBeenCalledWith('md');
    expect(mockDigitalTwin.fileHandler.getFileContent).not.toHaveBeenCalled();
  });

  it('should fetch and update file state if the file is not modified', async () => {
    await renderSidebar('reconfigure', 'mockedDTName');

    const modifiedFiles: FileState[] = [];
    mockDigitalTwin.fileHandler.getFileContent = jest
      .fn()
      .mockResolvedValue('fetched content');

    await act(async () => {
      await handleReconfigureFileClick(
        'testFile.md',
        mockDigitalTwin,
        modifiedFiles,
        setFileName,
        setFileContent,
        setFileType,
      );
    });

    expect(mockDigitalTwin.fileHandler.getFileContent).toHaveBeenCalledWith(
      'testFile.md',
    );
    expect(setFileName).toHaveBeenCalledWith('testFile.md');
    expect(setFileContent).toHaveBeenCalledWith('fetched content');
    expect(setFileType).toHaveBeenCalledWith('md');
  });

  it('opens the file name dialog when Add new file button is clicked', async () => {
    await renderSidebar('create');

    await waitFor(() => {
      fireEvent.click(screen.getByText('Add new file'));
    });

    expect(screen.getByText('Enter the file name')).toBeInTheDocument();
  });

  it('renders Sidebar with null digitalTwin when tab is create', async () => {
    (useSelector as unknown as jest.Mock).mockImplementationOnce(
      (selector: (state: RootState) => unknown) => {
        if (selector === selectDigitalTwinByName('')) {
          return null;
        }
        if (selector.toString().includes('state.files')) {
          return [];
        }
        return null;
      },
    );

    await renderSidebar('create', '');
  });
});
