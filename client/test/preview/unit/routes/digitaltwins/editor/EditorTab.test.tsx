import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';
import EditorTab from 'preview/route/digitaltwins/editor/EditorTab';
import { addOrUpdateFile } from 'preview/store/file.slice';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
}));

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

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders EditorTab', async () => {
    waitFor(async () => {
      render(
        <EditorTab
          fileName="fileName"
          fileContent="fileContent"
          setFileContent={mockSetFileContent}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('fileName')).toBeInTheDocument();
        expect(screen.getByText('fileContent')).toBeInTheDocument();
      });
    });
  });

  it('calls handleEditorChange via onChange correctly', async () => {
    waitFor(async () => {
      render(
        <EditorTab
          fileName="fileName"
          fileContent="fileContent"
          setFileContent={mockSetFileContent}
        />,
      );

      const newValue = 'New content';

      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: newValue },
      });

      await waitFor(() => {
        expect(mockSetFileContent).toHaveBeenCalledWith(newValue);
        expect(mockDispatch).toHaveBeenCalledWith(
          addOrUpdateFile({
            name: 'fileName',
            content: newValue,
            isModified: true,
          }),
        );
      });
    });
  });
});
