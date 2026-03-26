import * as SidebarRendering from 'route/digitaltwins/editor/sidebarRendering';
import * as SidebarFunctions from 'route/digitaltwins/editor/sidebarFunctions';
import { render, screen, fireEvent } from '@testing-library/react';
import { SimpleTreeView } from '@mui/x-tree-view';
import { mockDigitalTwin, mockLibraryAsset } from 'test/__mocks__/global_mocks';
import { FileState, FileType } from 'model/backend/interfaces/sharedInterfaces';

describe('renderFileSection', () => {
  const setFileName = jest.fn();
  const setFileContent = jest.fn();
  const setFileType = jest.fn();
  const setFilePrivacy = jest.fn();
  const setIsLibraryFile = jest.fn();
  const setIsLibraryAssetPath = jest.fn();
  const dispatch = jest.fn();

  const setters = {
    setFileName,
    setFileContent,
    setFileType,
    setFilePrivacy,
    setIsLibraryFile,
    setLibraryAssetPath: setIsLibraryAssetPath,
  };

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

  const assertFileTreeBehavior = (handleFileClick: jest.SpyInstance) => {
    expect(screen.getByText('label')).toBeInTheDocument();
    fireEvent.click(screen.getByText('label'));
    expect(screen.getByText('file')).toBeInTheDocument();
    fireEvent.click(screen.getByText('file'));
    expect(handleFileClick).toHaveBeenCalled();
  };

  const testCases = [
    {
      description: 'LibraryAsset (public)',
      asset: mockLibraryAsset,
      setup: () => {
        mockLibraryAsset.isPrivate = false;
      },
    },
    { description: 'DigitalTwin', asset: mockDigitalTwin },
  ];

  testCases.forEach(({ description, asset, setup }) => {
    it(`should render file section correctly and handle file click - ${description}`, () => {
      if (setup) setup();

      const handleFileClick = jest
        .spyOn(SidebarFunctions, 'handleFileClick')
        .mockImplementation(jest.fn());

      render(
        <SimpleTreeView>
          {SidebarRendering.renderFileSection(
            {
              label: 'label',
              filesToRender: ['file'],
              asset,
              tab: 'create',
              files,
              dispatch,
            },
            setters,
          )}
        </SimpleTreeView>,
      );

      assertFileTreeBehavior(handleFileClick);
    });
  });

  it('should render with null asset', () => {
    const handleFileClick = jest
      .spyOn(SidebarFunctions, 'handleFileClick')
      .mockImplementation(jest.fn());

    render(
      <SimpleTreeView>
        {SidebarRendering.renderFileSection(
          {
            label: 'Section',
            filesToRender: ['item1'],
            asset: null,
            tab: 'create',
            files,
            dispatch,
          },
          setters,
        )}
      </SimpleTreeView>,
    );

    expect(screen.getByText('Section')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Section'));
    expect(screen.getByText('item1')).toBeInTheDocument();
    fireEvent.click(screen.getByText('item1'));
    expect(handleFileClick).toHaveBeenCalled();
  });

  it('should pass options with library and libraryFiles to handleFileClick', () => {
    const handleFileClick = jest
      .spyOn(SidebarFunctions, 'handleFileClick')
      .mockImplementation(jest.fn());

    render(
      <SimpleTreeView>
        {SidebarRendering.renderFileSection(
          {
            label: 'label',
            filesToRender: ['file'],
            asset: mockDigitalTwin,
            tab: 'reconfigure',
            files,
            dispatch,
          },
          setters,
          {
            library: true,
            libraryFiles: [],
          },
        )}
      </SimpleTreeView>,
    );

    fireEvent.click(screen.getByText('label'));
    fireEvent.click(screen.getByText('file'));
    expect(handleFileClick).toHaveBeenCalledWith(
      expect.anything(),
      'reconfigure',
      setters,
      expect.objectContaining({
        library: true,
        libraryFiles: [],
      }),
    );
  });
});
