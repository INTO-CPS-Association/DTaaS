import { render, screen, waitFor } from '@testing-library/react';
import EditorTab, {
  handleEditorChange,
} from 'preview/route/digitaltwins/editor/EditorTab';
import { addOrUpdateFile } from 'preview/store/file.slice';
import { addOrUpdateLibraryFile } from 'preview/store/libraryConfigFiles.slice';

jest.mock('preview/store/file.slice', () => ({
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

  it('calls handleEditorChange via onChange correctly - create tab', async () => {
    await handleEditorChange(
      'create',
      'new content',
      jest.fn(),
      mockSetFileContent,
      'fileName',
      'private',
      false,
      '',
      mockDispatch,
    );

    expect(mockSetFileContent).toHaveBeenCalledWith('new content');
    expect(mockDispatch).toHaveBeenCalledWith(
      addOrUpdateFile({
        name: 'fileName',
        content: 'new content',
        isNew: true,
        isModified: true,
      }),
    );
  });

  it('calls handleEditorChange via onChange correctly - create tab and libraryFile', async () => {
    await handleEditorChange(
      'create',
      'new content',
      jest.fn(),
      mockSetFileContent,
      'fileName',
      'private',
      true,
      'path',
      mockDispatch,
    );

    expect(mockSetFileContent).toHaveBeenCalledWith('new content');
    expect(mockDispatch).toHaveBeenCalledWith(
      addOrUpdateLibraryFile({
        assetPath: 'path',
        fileName: 'fileName',
        fileContent: 'new content',
        isNew: true,
        isModified: true,
        isPrivate: true,
      }),
    );
  });

  it('calls handleEditorChange via onChange correctly - reconfigure tab', async () => {
    await handleEditorChange(
      'reconfigure',
      'new content',
      jest.fn(),
      mockSetFileContent,
      'fileName',
      'private',
      false,
      '',
      mockDispatch,
    );

    expect(mockSetFileContent).toHaveBeenCalledWith('new content');
    expect(mockDispatch).toHaveBeenCalledWith(
      addOrUpdateFile({
        name: 'fileName',
        content: 'new content',
        isNew: true,
        isModified: true,
      }),
    );
  });

  it('calls handleEditorChange via onChange correctly - reconfigure tab and libraryFile', async () => {
    await handleEditorChange(
      'reconfigure',
      'new content',
      jest.fn(),
      mockSetFileContent,
      'fileName',
      'private',
      true,
      'path',
      mockDispatch,
    );

    expect(mockSetFileContent).toHaveBeenCalledWith('new content');
    expect(mockDispatch).toHaveBeenCalledWith(
      addOrUpdateLibraryFile({
        assetPath: 'path',
        fileName: 'fileName',
        fileContent: 'new content',
        isNew: false,
        isModified: true,
        isPrivate: true,
      }),
    );
  });
});
