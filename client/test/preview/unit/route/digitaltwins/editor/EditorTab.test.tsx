import { render, screen, waitFor } from '@testing-library/react';
import EditorTab, {
  handleEditorChange,
} from 'preview/route/digitaltwins/editor/EditorTab';
import { addOrUpdateFile } from 'model/store/file.slice';
import { addOrUpdateLibraryFile } from 'model/store/libraryConfigFiles.slice';

jest.mock('model/store/file.slice', () => ({
  addOrUpdateFile: jest.fn(),
}));

describe('EditorTab', () => {
  const mockSetFileContent = jest.fn();
  const mockDispatch = jest.fn();

  beforeEach(() => {
    (jest.requireMock('react-redux').useDispatch as jest.Mock).mockReturnValue(
      mockDispatch,
    );
  });

  it('renders EditorTab', async () => {
    waitFor(async () => {
      render(
        <EditorTab
          tab={'reconfigure'}
          fileName="fileName"
          fileContent="fileContent"
          filePrivacy="private"
          isLibraryFile={false}
          libraryAssetPath=""
          setFileContent={mockSetFileContent}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('fileName')).toBeInTheDocument();
        expect(screen.getByText('fileContent')).toBeInTheDocument();
      });
    });
  });

  // Parameterized tests for handleEditorChange to reduce duplication
  describe('handleEditorChange', () => {
    const testCases = [
      {
        description: 'create tab with regular file',
        tab: 'create',
        isLibraryFile: false,
        libraryAssetPath: '',
        expectedDispatch: addOrUpdateFile({
          name: 'fileName',
          content: 'new content',
          isNew: true,
          isModified: true,
        }),
      },
      {
        description: 'create tab with library file',
        tab: 'create',
        isLibraryFile: true,
        libraryAssetPath: 'path',
        expectedDispatch: addOrUpdateLibraryFile({
          assetPath: 'path',
          fileName: 'fileName',
          fileContent: 'new content',
          isNew: true,
          isModified: true,
          isPrivate: true,
        }),
      },
      {
        description: 'reconfigure tab with regular file',
        tab: 'reconfigure',
        isLibraryFile: false,
        libraryAssetPath: '',
        expectedDispatch: addOrUpdateFile({
          name: 'fileName',
          content: 'new content',
          isNew: true,
          isModified: true,
        }),
      },
      {
        description: 'reconfigure tab with library file',
        tab: 'reconfigure',
        isLibraryFile: true,
        libraryAssetPath: 'path',
        expectedDispatch: addOrUpdateLibraryFile({
          assetPath: 'path',
          fileName: 'fileName',
          fileContent: 'new content',
          isNew: false,
          isModified: true,
          isPrivate: true,
        }),
      },
    ];

    testCases.forEach(
      ({
        description,
        tab,
        isLibraryFile,
        libraryAssetPath,
        expectedDispatch,
      }) => {
        it(`calls onChange correctly - ${description}`, async () => {
          await handleEditorChange(
            tab,
            'new content',
            jest.fn(),
            mockSetFileContent,
            'fileName',
            'private',
            isLibraryFile,
            libraryAssetPath,
            mockDispatch,
          );

          expect(mockSetFileContent).toHaveBeenCalledWith('new content');
          expect(mockDispatch).toHaveBeenCalledWith(expectedDispatch);
        });
      },
    );
  });
});
