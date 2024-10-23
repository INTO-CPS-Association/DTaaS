import {
  render,
  waitFor,
  screen,
  act,
  fireEvent,
} from '@testing-library/react';
import Sidebar, {
  handleFileClick,
} from 'preview/route/digitaltwins/editor/Sidebar';
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

  const clickFile = async (fileType: string, expectedFileName: string) => {
    const fileNode = screen.getByText(fileType);
    fireEvent.click(fileNode);

    await waitFor(() => {
      expect(screen.getByText(expectedFileName)).toBeInTheDocument();
    });

    const file = screen.getByText(expectedFileName);
    fireEvent.click(file);
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

    await act(async () => {
      render(
        <Provider store={store}>
          <Sidebar
            name="mockedDTName"
            setFileName={setFileName}
            setFileContent={setFileContent}
            setFileType={setFileType}
          />
        </Provider>,
      );
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders Sidebar', async () => {
    await waitFor(() => {
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Lifecycle')).toBeInTheDocument();
      expect(screen.getByText('Configuration')).toBeInTheDocument();
    });
  });

  it('should update file state if the file is modified', async () => {
    const modifiedFiles: FileState[] = [
      { name: 'testFile.md', content: 'modified content', isModified: true },
    ];

    await act(async () => {
      await handleFileClick(
        'testFile.md',
        mockDigitalTwin,
        setFileName,
        setFileContent,
        setFileType,
        modifiedFiles,
      );
    });

    expect(setFileName).toHaveBeenCalledWith('testFile.md');
    expect(setFileContent).toHaveBeenCalledWith('modified content');
    expect(setFileType).toHaveBeenCalledWith('md');
    expect(mockDigitalTwin.getFileContent).not.toHaveBeenCalled();
  });

  it('should fetch and update file state if the file is not modified', async () => {
    const modifiedFiles: FileState[] = [];
    mockDigitalTwin.getFileContent = jest
      .fn()
      .mockResolvedValue('fetched content');

    await act(async () => {
      await handleFileClick(
        'testFile.md',
        mockDigitalTwin,
        setFileName,
        setFileContent,
        setFileType,
        modifiedFiles,
      );
    });

    expect(mockDigitalTwin.getFileContent).toHaveBeenCalledWith('testFile.md');
    expect(setFileName).toHaveBeenCalledWith('testFile.md');
    expect(setFileContent).toHaveBeenCalledWith('fetched content');
    expect(setFileType).toHaveBeenCalledWith('md');
  });

  it('should set error message if fetching file content fails', async () => {
    const modifiedFiles: FileState[] = [];
    mockDigitalTwin.getFileContent = jest.fn().mockResolvedValue(null);

    await act(async () => {
      await handleFileClick(
        'testFile.md',
        mockDigitalTwin,
        setFileName,
        setFileContent,
        setFileType,
        modifiedFiles,
      );
    });

    expect(mockDigitalTwin.getFileContent).toHaveBeenCalledWith('testFile.md');
    expect(setFileContent).toHaveBeenCalledWith(
      'Error fetching testFile.md content',
    );
  });

  it('calls handleFileClick when a description file is clicked', async () => {
    await clickFile('Description', 'descriptionFile');
  });

  it('calls handleFileClick when a config file is clicked', async () => {
    await clickFile('Configuration', 'configFile');
  });

  it('calls handleFileClick when a lifecycle file is clicked', async () => {
    await clickFile('Lifecycle', 'lifecycleFile');
  });

  it('call setFileContent with error message if file content is null', async () => {
    mockDigitalTwin.getFileContent = jest.fn().mockResolvedValue(null);

    await act(async () => {
      await handleFileClick(
        'testFile.md',
        mockDigitalTwin,
        setFileName,
        setFileContent,
        setFileType,
        [],
      );
    });

    expect(setFileContent).toHaveBeenCalledWith(
      'Error fetching testFile.md content',
    );
  });
});
