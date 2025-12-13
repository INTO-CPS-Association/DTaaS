import { render, screen } from '@testing-library/react';
import CreateDialogs from 'preview/route/digitaltwins/create/CreateDialogs';

jest.mock('preview/route/digitaltwins/create/ChangeFileNameDialog', () => ({
  __esModule: true,
  default: () => <div data-testid="change-file-name-dialog" />,
}));

jest.mock('preview/route/digitaltwins/create/DeleteFileDialog', () => ({
  __esModule: true,
  default: () => <div data-testid="delete-file-dialog" />,
}));

jest.mock('preview/route/digitaltwins/create/ConfirmDeleteDialog', () => ({
  __esModule: true,
  default: () => <div data-testid="confirm-delete-dialog" />,
}));

jest.mock('preview/route/digitaltwins/create/CreateDTDialog', () => ({
  __esModule: true,
  default: () => <div data-testid="create-dt-dialog" />,
}));
describe('CreateDialogs', () => {
  const mockSetFileName = jest.fn();
  const mockSetFileContent = jest.fn();
  const mockSetFileType = jest.fn();
  const mockSetNewDigitalTwinName = jest.fn();
  const mockSetErrorMessage = jest.fn();
  const mockSetOpenConfirmDeleteDialog = jest.fn();
  const mockSetOpenCreateDTDialog = jest.fn();

  const defaultProps = {
    openChangeFileNameDialog: true,
    setOpenChangeFileNameDialog: jest.fn(),
    fileName: 'testFile.txt',
    setFileName: mockSetFileName,
    setFileContent: mockSetFileContent,
    setFileType: mockSetFileType,
    openDeleteFileDialog: true,
    setOpenDeleteFileDialog: jest.fn(),
    openConfirmDeleteDialog: true,
    setOpenConfirmDeleteDialog: mockSetOpenConfirmDeleteDialog,
    openCreateDTDialog: true,
    setOpenCreateDTDialog: mockSetOpenCreateDTDialog,
    newDigitalTwinName: 'testDigitalTwin',
    setNewDigitalTwinName: mockSetNewDigitalTwinName,
    errorMessage: '',
    setErrorMessage: mockSetErrorMessage,
    isPrivate: true,
  };

  beforeEach(() => {
    render(<CreateDialogs {...defaultProps} />);
  });

  it('renders ChangeFileNameDialog when openChangeFileNameDialog is true', () => {
    expect(screen.getByTestId('change-file-name-dialog')).toBeInTheDocument();
  });

  it('renders DeleteFileDialog when openDeleteFileDialog is true', () => {
    expect(screen.getByTestId('delete-file-dialog')).toBeInTheDocument();
  });

  it('renders CreateDTDialog when openCreateDTDialog is true', () => {
    expect(screen.getByTestId('create-dt-dialog')).toBeInTheDocument();
  });

  it('renders ConfirmDeleteDialog when openConfirmDeleteDialog is true', () => {
    expect(screen.getByTestId('confirm-delete-dialog')).toBeInTheDocument();
  });
});
