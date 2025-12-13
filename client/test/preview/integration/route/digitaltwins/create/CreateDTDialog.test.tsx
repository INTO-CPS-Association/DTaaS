import CreateDTDialog from 'preview/route/digitaltwins/create/CreateDTDialog';
import { act, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import fileSlice from 'preview/store/file.slice';
import { validateFiles } from 'preview/util/fileUtils';
import { initDigitalTwin } from 'model/backend/util/init';
import cartSlice from 'preview/store/cart.slice';

jest.mock('preview/util/fileUtils', () => ({
  validateFiles: jest.fn(),
  addDefaultFiles: jest.fn(),
}));
jest.mock('model/backend/util/init', () => ({
  initDigitalTwin: jest.fn(),
}));

const store = configureStore({
  reducer: combineReducers({
    files: fileSlice,
    cart: cartSlice,
  }),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

describe('CreateDTDialog - handleConfirm function', () => {
  const newDigitalTwinName = 'newDTName';
  const errorMessage = '';
  const setOpenCreateDTDialog = jest.fn();
  const setNewDigitalTwinName = jest.fn();
  const setErrorMessage = jest.fn();
  const setFileName = jest.fn();
  const setFileContent = jest.fn();
  const setFileType = jest.fn();

  beforeEach(() => {
    act(() => {
      render(
        <Provider store={store}>
          <CreateDTDialog
            open={true}
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
  });

  it('does not proceed if file validation fails', async () => {
    (validateFiles as jest.Mock).mockReturnValue(true);

    const confirmButton = screen.getByRole('button', { name: /Confirm/i });
    await act(async () => {
      confirmButton.click();
    });

    expect(validateFiles).toHaveBeenCalled();
    expect(initDigitalTwin).not.toHaveBeenCalled();
  });

  it('handles error if digitalTwin.create returns an error', async () => {
    (validateFiles as jest.Mock).mockReturnValue(false);
    const mockDigitalTwin = {
      create: jest.fn().mockResolvedValue('Error: creation failed'),
    };
    (initDigitalTwin as jest.Mock).mockResolvedValue(mockDigitalTwin);

    const confirmButton = screen.getByRole('button', { name: /Confirm/i });
    await act(async () => {
      confirmButton.click();
    });

    expect(initDigitalTwin).toHaveBeenCalledWith(newDigitalTwinName);
    expect(mockDigitalTwin.create).toHaveBeenCalled();
  });

  it('handles success if digitalTwin.create is successful', async () => {
    (validateFiles as jest.Mock).mockReturnValue(false);
    const mockDigitalTwin = { create: jest.fn().mockResolvedValue('Success') };
    (initDigitalTwin as jest.Mock).mockResolvedValue(mockDigitalTwin);

    const confirmButton = screen.getByRole('button', { name: /Confirm/i });
    await act(async () => {
      confirmButton.click();
    });

    expect(initDigitalTwin).toHaveBeenCalledWith(newDigitalTwinName);
    expect(mockDigitalTwin.create).toHaveBeenCalled();
  });

  it('resets dialog after clicking cancel', async () => {
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await act(async () => {
      cancelButton.click();
    });

    expect(setOpenCreateDTDialog).toHaveBeenCalled();
    expect(setFileName).toHaveBeenCalledWith('');
    expect(setFileContent).toHaveBeenCalledWith('');
    expect(setFileType).toHaveBeenCalledWith('');
  });
});
