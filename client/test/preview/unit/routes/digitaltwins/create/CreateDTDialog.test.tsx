import * as React from 'react';
import CreateDTDialog from 'preview/route/digitaltwins/create/CreateDTDialog';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import store from 'store/store';
import { FileState } from 'model/backend/gitlab/interfaces';
import { initDigitalTwin } from 'preview/util/init';
import { mockDigitalTwin } from 'test/preview/__mocks__/global_mocks';
import { validateFiles } from 'preview/util/fileUtils';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('preview/util/fileUtils', () => ({
  ...jest.requireActual('preview/util/fileUtils'),
  validateFiles: jest.fn().mockReturnValue(false),
  addDefaultFiles: jest.fn(),
}));

jest.mock('preview/util/digitalTwin', () => ({
  DigitalTwin: jest.fn().mockImplementation(() => mockDigitalTwin),
}));

jest.mock('preview/util/init', () => ({
  initDigitalTwin: jest.fn(),
}));

describe('CreateDTDialog', () => {
  const showDialog = true;
  const newDigitalTwinName = 'testName';
  const setNewDigitalTwinName = jest.fn();
  const errorMessage = '';
  const setErrorMessage = jest.fn();
  const setFileName = jest.fn();
  const setFileContent = jest.fn();
  const setFileType = jest.fn();
  const setOpenCreateDTDialog = jest.fn();

  const mockDispatch = jest.fn();

  beforeEach(() => {
    (useDispatch as unknown as jest.Mock).mockReturnValue(mockDispatch);
    (useSelector as unknown as jest.Mock).mockReturnValue([
      {
        name: 'testFile',
        content: 'testContent',
        type: 'testType',
        isNew: true,
      } as FileState,
    ]);

    render(
      <Provider store={store}>
        <CreateDTDialog
          open={showDialog}
          setOpenCreateDTDialog={setOpenCreateDTDialog}
          newDigitalTwinName={newDigitalTwinName}
          setNewDigitalTwinName={setNewDigitalTwinName}
          errorMessage={errorMessage}
          setErrorMessage={setErrorMessage}
          setFileName={setFileName}
          setFileContent={setFileContent}
          setFileType={setFileType}
        />
      </Provider>,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the CreateDTDialog with the correct message', () => {
    expect(
      screen.getByText(/Are you sure you want to create the/i),
    ).toBeInTheDocument();
    expect(screen.getByText(newDigitalTwinName)).toBeInTheDocument();
  });

  it('calls onClose when "Cancel" button is clicked', () => {
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(setOpenCreateDTDialog).toHaveBeenCalledWith(false);
    expect(setFileName).toHaveBeenCalledWith('');
    expect(setFileContent).toHaveBeenCalledWith('');
    expect(setFileType).toHaveBeenCalledWith('');
  });

  it('calls handleConfirm when "Create" button is clicked', async () => {
    (validateFiles as jest.Mock).mockReturnValue(false);
    const mockDigitalTwinInstance = {
      create: jest.fn().mockResolvedValue('Success'),
    };

    (initDigitalTwin as jest.Mock).mockResolvedValue(mockDigitalTwinInstance);

    const createButton = screen.getByRole('button', { name: /Confirm/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(validateFiles).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalled();
      expect(setOpenCreateDTDialog).toHaveBeenCalledWith(false);
      expect(setFileName).toHaveBeenCalledWith('');
      expect(setFileContent).toHaveBeenCalledWith('');
      expect(setFileType).toHaveBeenCalledWith('');
      expect(setNewDigitalTwinName).toHaveBeenCalledWith('');
    });
  });

  it('calls handleConfirm when "Create" button is clicked and an error occurs', async () => {
    const mockDigitalTwinInstance = {
      create: jest.fn().mockResolvedValue('Error'),
    };

    (initDigitalTwin as jest.Mock).mockResolvedValue(mockDigitalTwinInstance);

    const createButton = screen.getByRole('button', { name: /Confirm/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalled();
      expect(setOpenCreateDTDialog).toHaveBeenCalledWith(false);
      expect(setFileName).toHaveBeenCalledWith('');
      expect(setFileContent).toHaveBeenCalledWith('');
      expect(setFileType).toHaveBeenCalledWith('');
      expect(setNewDigitalTwinName).toHaveBeenCalledWith('');
    });
  });

  it('calls handleConfirm when "Create" button is clicked but validateFiles is true', async () => {
    (validateFiles as jest.Mock).mockReturnValue(true);

    const createButton = screen.getByRole('button', { name: /Confirm/i });
    fireEvent.click(createButton);

    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
