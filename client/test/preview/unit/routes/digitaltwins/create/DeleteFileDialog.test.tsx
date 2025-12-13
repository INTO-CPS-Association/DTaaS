import DeleteFileDialog from 'preview/route/digitaltwins/create/DeleteFileDialog';
import { render, screen, fireEvent } from '@testing-library/react';
import { useDispatch } from 'react-redux';
import { deleteFile } from 'preview/store/file.slice';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
}));

describe('DeleteFileDialog', () => {
  const onClose = jest.fn();
  const fileName = 'fileName';
  const setFileName = jest.fn();
  const setFileContent = jest.fn();
  const dispatch = jest.fn();

  beforeEach(() => {
    (useDispatch as unknown as jest.Mock).mockReturnValue(dispatch);
    render(
      <DeleteFileDialog
        open={true}
        setOpenDeleteFileDialog={onClose}
        fileName={fileName}
        setFileName={setFileName}
        setFileContent={setFileContent}
      />,
    );
  });

  it('should render the dialog', () => {
    expect(
      screen.getByText(/Are you sure you want to delete/),
    ).toBeInTheDocument();
  });

  it('should handle delete file when Yes button is clicked', () => {
    fireEvent.click(screen.getByText('Yes'));

    expect(dispatch).toHaveBeenCalledWith(deleteFile(fileName));

    expect(setFileName).toHaveBeenCalledWith('');
    expect(setFileContent).toHaveBeenCalledWith('');

    expect(onClose).toHaveBeenCalled();
  });

  it('should handle close dialog when No button is clicked', () => {
    fireEvent.click(screen.getByText('No'));

    expect(onClose).toHaveBeenCalled();
  });
});
