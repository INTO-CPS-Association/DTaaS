import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmDeleteDialog from 'preview/route/digitaltwins/create/ConfirmDeleteDialog';
import { useSelector, useDispatch } from 'react-redux';
import {
  removeAllCreationFiles,
  addOrUpdateFile,
} from 'preview/store/file.slice';
import { defaultFiles } from 'model/backend/gitlab/digitalTwinConfig/constants';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

describe('ConfirmDeleteDialog', () => {
  const showDialog = true;
  const setShowDialog = jest.fn();
  const setFileName = jest.fn();
  const setFileContent = jest.fn();
  const setFileType = jest.fn();
  const setNewDigitalTwinName = jest.fn();

  const mockDispatch = jest.fn();

  beforeEach(() => {
    (useDispatch as unknown as jest.Mock).mockReturnValue(mockDispatch);
    (useSelector as unknown as jest.Mock).mockReturnValue([
      { name: defaultFiles[0].name, isNew: true },
    ]);

    render(
      <ConfirmDeleteDialog
        open={showDialog}
        setOpenConfirmDeleteDialog={setShowDialog}
        setFileName={setFileName}
        setFileContent={setFileContent}
        setFileType={setFileType}
        setNewDigitalTwinName={setNewDigitalTwinName}
      />,
    );
  });

  it('renders the ConfirmDeleteDialog', () => {
    expect(
      screen.getByText(
        /Are you sure you want to delete the inserted files and their content?/i,
      ),
    ).toBeInTheDocument();
  });

  it('handles confirm cancel', () => {
    const confirmButton = screen.getByRole('button', { name: /Yes/i });
    fireEvent.click(confirmButton);

    expect(setFileName).toHaveBeenCalledWith('');
    expect(setFileContent).toHaveBeenCalledWith('');
    expect(setFileType).toHaveBeenCalledWith('');
    expect(setNewDigitalTwinName).toHaveBeenCalledWith('');

    expect(mockDispatch).toHaveBeenCalledWith(removeAllCreationFiles());

    const existingFileName = defaultFiles[0].name;
    defaultFiles.forEach((file) => {
      if (file.name !== existingFileName) {
        expect(mockDispatch).toHaveBeenCalledWith(
          addOrUpdateFile({
            name: file.name,
            content: '',
            isNew: true,
            isModified: false,
          }),
        );
      }
    });

    expect(mockDispatch).toHaveBeenCalledTimes(1 + (defaultFiles.length - 1));
  });

  it('closes the dialog on cancel', () => {
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(setShowDialog).toHaveBeenCalledWith(false);
  });
});
