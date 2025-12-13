import * as SidebarRendering from 'preview/route/digitaltwins/editor/sidebarRendering';
import * as SidebarFunctions from 'preview/route/digitaltwins/editor/sidebarFunctions';
import { render, screen, fireEvent } from '@testing-library/react';
import { SimpleTreeView } from '@mui/x-tree-view';
import {
  mockDigitalTwin,
  mockLibraryAsset,
} from 'test/preview/__mocks__/global_mocks';
import { FileState, FileType } from 'model/backend/interfaces/sharedInterfaces';

describe('SidebarRendering', () => {
  const setFileName = jest.fn();
  const setFileContent = jest.fn();
  const setFileType = jest.fn();
  const setFilePrivacy = jest.fn();
  const setIsLibraryFile = jest.fn();
  const setIsLibraryAssetPath = jest.fn();
  const dispatch = jest.fn();

  const files: FileState[] = [
    {
      name: 'file',
      content: 'content',
      type: FileType.DESCRIPTION,
      isModified: false,
      isNew: true,
    },
  ];

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render file tree items correctly and handle file click - DigitalTwin', () => {
    const handleFileClick = jest
      .spyOn(SidebarFunctions, 'handleFileClick')
      .mockImplementation(jest.fn());

    render(
      <SimpleTreeView>
        {SidebarRendering.renderFileTreeItems(
          'label',
          ['file'],
          mockDigitalTwin,
          setFileName,
          setFileContent,
          setFileType,
          setFilePrivacy,
          files,
          'create',
          dispatch,
          setIsLibraryFile,
          setIsLibraryAssetPath,
        )}
      </SimpleTreeView>,
    );

    expect(screen.getByText('label')).toBeInTheDocument();
    fireEvent.click(screen.getByText('label'));
    expect(screen.getByText('file')).toBeInTheDocument();
    fireEvent.click(screen.getByText('file'));

    expect(handleFileClick).toHaveBeenCalled();
  });

  it('should render file tree items correctly and handle file click - LibraryAsset', () => {
    const handleFileClick = jest
      .spyOn(SidebarFunctions, 'handleFileClick')
      .mockImplementation(jest.fn());

    mockLibraryAsset.isPrivate = false;

    render(
      <SimpleTreeView>
        {SidebarRendering.renderFileTreeItems(
          'label',
          ['file'],
          mockLibraryAsset,
          setFileName,
          setFileContent,
          setFileType,
          setFilePrivacy,
          files,
          'create',
          dispatch,
          setIsLibraryFile,
          setIsLibraryAssetPath,
        )}
      </SimpleTreeView>,
    );

    expect(screen.getByText('label')).toBeInTheDocument();
    fireEvent.click(screen.getByText('label'));
    expect(screen.getByText('file')).toBeInTheDocument();
    fireEvent.click(screen.getByText('file'));

    expect(handleFileClick).toHaveBeenCalled();
  });

  it('should render file section correctly and handle file click - LibraryAsset', () => {
    const handleFileClick = jest
      .spyOn(SidebarFunctions, 'handleFileClick')
      .mockImplementation(jest.fn());

    mockLibraryAsset.isPrivate = false;

    render(
      <SimpleTreeView>
        {SidebarRendering.renderFileSection(
          'label',
          'Digital Twins',
          ['file'],
          mockLibraryAsset,
          setFileName,
          setFileContent,
          setFileType,
          setFilePrivacy,
          files,
          'create',
          dispatch,
          setIsLibraryFile,
          setIsLibraryAssetPath,
        )}
      </SimpleTreeView>,
    );

    expect(screen.getByText('label')).toBeInTheDocument();
    fireEvent.click(screen.getByText('label'));
    expect(screen.getByText('file')).toBeInTheDocument();

    fireEvent.click(screen.getByText('file'));
    expect(handleFileClick).toHaveBeenCalled();
  });

  it('should render file section correctly and handle file click - DigitalTwin', () => {
    const handleFileClick = jest
      .spyOn(SidebarFunctions, 'handleFileClick')
      .mockImplementation(jest.fn());

    render(
      <SimpleTreeView>
        {SidebarRendering.renderFileSection(
          'label',
          'Digital Twins',
          ['file'],
          mockDigitalTwin,
          setFileName,
          setFileContent,
          setFileType,
          setFilePrivacy,
          files,
          'create',
          dispatch,
          setIsLibraryFile,
          setIsLibraryAssetPath,
        )}
      </SimpleTreeView>,
    );

    expect(screen.getByText('label')).toBeInTheDocument();
    fireEvent.click(screen.getByText('label'));
    expect(screen.getByText('file')).toBeInTheDocument();

    fireEvent.click(screen.getByText('file'));
    expect(handleFileClick).toHaveBeenCalled();
  });
});
