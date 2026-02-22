import { render, screen, fireEvent } from '@testing-library/react';
import EditorTab, {
  handleEditorChange,
} from 'route/digitaltwins/editor/EditorTab';
import { addOrUpdateFile } from 'model/store/file.slice';
import { addOrUpdateLibraryFile } from 'model/store/libraryConfigFiles.slice';

jest.mock('@monaco-editor/react', () => ({
  default: ({ onChange }: { onChange?: (value: string) => void }) => (
    <textarea
      data-testid="monaco-editor"
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

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

  it('renders EditorTab', () => {
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
  });

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
          isNew: false,
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
        it(`calls onChange correctly - ${description}`, () => {
          handleEditorChange(
            {
              tab,
              fileName: 'fileName',
              filePrivacy: 'private',
              isLibraryFile,
              libraryAssetPath,
            },
            'new content',
            {
              setEditorValue: jest.fn(),
              setFileContent: mockSetFileContent,
              dispatch: mockDispatch,
            },
          );

          expect(mockSetFileContent).toHaveBeenCalledWith('new content');
          expect(mockDispatch).toHaveBeenCalledWith(expectedDispatch);
        });
      },
    );

    it('uses empty string when value is undefined', () => {
      const mockSetEditorValue = jest.fn();

      handleEditorChange(
        {
          tab: 'create',
          fileName: 'fileName',
          filePrivacy: 'private',
          isLibraryFile: false,
          libraryAssetPath: '',
        },
        undefined,
        {
          setEditorValue: mockSetEditorValue,
          setFileContent: mockSetFileContent,
          dispatch: mockDispatch,
        },
      );

      expect(mockSetEditorValue).toHaveBeenCalledWith('');
      expect(mockSetFileContent).toHaveBeenCalledWith('');
      expect(mockDispatch).toHaveBeenCalledWith(
        addOrUpdateFile({
          name: 'fileName',
          content: '',
          isNew: true,
          isModified: true,
        }),
      );
    });

    it('handles reconfigure tab with non-library file that has libraryAssetPath', () => {
      handleEditorChange(
        {
          tab: 'reconfigure',
          fileName: 'fileName',
          filePrivacy: 'private',
          isLibraryFile: false,
          libraryAssetPath: 'some/path',
        },
        'content',
        {
          setEditorValue: jest.fn(),
          setFileContent: mockSetFileContent,
          dispatch: mockDispatch,
        },
      );

      expect(mockDispatch).toHaveBeenCalledWith(
        addOrUpdateLibraryFile({
          assetPath: 'some/path',
          fileName: 'fileName',
          fileContent: 'content',
          isNew: false,
          isModified: true,
          isPrivate: true,
        }),
      );
    });
  });

  it('renders the "select a file" message and no editor when fileName is empty', () => {
    render(
      <EditorTab
        tab={'reconfigure'}
        fileName=""
        fileContent=""
        filePrivacy="private"
        isLibraryFile={false}
        libraryAssetPath=""
        setFileContent={mockSetFileContent}
      />,
    );

    expect(
      screen.getByText('Please select a file to edit.'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('monaco-editor')).not.toBeInTheDocument();
  });

  it('calls handleEditorChange via the editor onChange prop', () => {
    render(
      <EditorTab
        tab={'create'}
        fileName="test.md"
        fileContent="initial"
        filePrivacy="private"
        isLibraryFile={false}
        libraryAssetPath=""
        setFileContent={mockSetFileContent}
      />,
    );

    const editor = screen.getByTestId('monaco-editor');
    fireEvent.change(editor, { target: { value: 'updated content' } });

    expect(mockSetFileContent).toHaveBeenCalledWith('updated content');
    expect(mockDispatch).toHaveBeenCalled();
  });

  it('renders editor and no message when a file is selected', () => {
    render(
      <EditorTab
        tab={'create'}
        fileName="test.md"
        fileContent="content"
        filePrivacy="private"
        isLibraryFile={false}
        libraryAssetPath=""
        setFileContent={mockSetFileContent}
      />,
    );

    expect(
      screen.queryByText('Please select a file to edit.'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
  });
});
