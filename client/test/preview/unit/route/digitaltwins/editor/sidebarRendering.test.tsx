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

  // Helper function to reduce duplication in assertions
  const assertFileTreeBehavior = (handleFileClick: jest.SpyInstance) => {
    expect(screen.getByText('label')).toBeInTheDocument();
    fireEvent.click(screen.getByText('label'));
    expect(screen.getByText('file')).toBeInTheDocument();
    fireEvent.click(screen.getByText('file'));
    expect(handleFileClick).toHaveBeenCalled();
  };

  describe('renderFileTreeItems', () => {
    const testCases = [
      { description: 'DigitalTwin', asset: mockDigitalTwin },
      {
        description: 'LibraryAsset',
        asset: mockLibraryAsset,
        setup: () => {
          mockLibraryAsset.isPrivate = false;
        },
      },
    ];

    testCases.forEach(({ description, asset, setup }) => {
      it(`should render file tree items correctly and handle file click - ${description}`, () => {
        if (setup) setup();

        const handleFileClick = jest
          .spyOn(SidebarFunctions, 'handleFileClick')
          .mockImplementation(jest.fn());

        render(
          <SimpleTreeView>
            {SidebarRendering.renderFileTreeItems(
              'label',
              ['file'],
              asset,
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

        assertFileTreeBehavior(handleFileClick);
      });
    });
  });

  describe('renderFileSection', () => {
    const testCases = [
      {
        description: 'LibraryAsset',
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
              'label',
              'Digital Twins',
              ['file'],
              asset,
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

        assertFileTreeBehavior(handleFileClick);
      });
    });
  });
});
