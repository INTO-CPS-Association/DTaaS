import { render, waitFor, screen, act } from '@testing-library/react';
import Sidebar, {
  handleFileClick,
} from 'preview/route/digitaltwins/editor/Sidebar';
import { FileState } from 'preview/store/file.slice';
import * as React from 'react';
import { Provider, useSelector } from 'react-redux';
import store from 'store/store';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

describe('Sidebar', () => {
  const setFileName = jest.fn();
  const setFileContent = jest.fn();
  const setFileType = jest.fn();

  const modifiedFilesMock: FileState[] = [
    { name: 'desc1.md', content: 'Description content', isModified: true },
    { name: 'life1.md', content: 'Lifecycle content', isModified: true },
    { name: 'config1.md', content: 'Config content', isModified: true },
  ];

  beforeEach(async () => {
    (useSelector as jest.Mock).mockReturnValue({
      descriptionFiles: ['desc1.md', 'desc2.md'],
      lifecycleFiles: ['life1.md'],
      configFiles: ['config1.md', 'ServiceFile.md'],
      getDescriptionFiles: jest
        .fn()
        .mockResolvedValue('Mocked description files'),
      getLifecycleFiles: jest.fn().mockResolvedValue('Mocked lifecycle files'),
      getConfigFiles: jest.fn().mockResolvedValue('Mocked config files'),
      modifiedFiles: modifiedFilesMock,
    });

    await act(async () => {
      render(
        <Provider store={store}>
          <Sidebar
            name="name"
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
      expect(screen.getByText('Config')).toBeInTheDocument();
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

  it('renders TreeItems for config files', async () => {
    await waitFor(() => {
      expect(screen.getByText('Config')).toBeInTheDocument();
    });

    const configItems = screen.getAllByText(/config/i);
    expect(configItems.length).toBe(2);
  });
});
