import ConfirmDeleteDialog from 'preview/route/digitaltwins/create/ConfirmDeleteDialog';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import fileSlice, { addOrUpdateFile } from 'preview/store/file.slice';
import { act, render, screen } from '@testing-library/react';

const store = configureStore({
  reducer: combineReducers({
    files: fileSlice,
  }),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

describe('ConfirmDeleteDialog', () => {
  const setOpenConfirmDeleteDialog = jest.fn();
  const setFileName = jest.fn();
  const setFileContent = jest.fn();
  const setFileType = jest.fn();
  const setNewDigitalTwinName = jest.fn();

  beforeEach(() => {
    act(() => {
      render(
        <Provider store={store}>
          <ConfirmDeleteDialog
            open={true}
            setOpenConfirmDeleteDialog={setOpenConfirmDeleteDialog}
            setFileName={setFileName}
            setFileContent={setFileContent}
            setFileType={setFileType}
            setNewDigitalTwinName={setNewDigitalTwinName}
          />
        </Provider>,
      );
    });
  });

  it('handles fileExists functionality', () => {
    const file = {
      name: 'description.md',
      content: 'test',
      isNew: true,
      isModified: false,
    };

    act(() => {
      store.dispatch(addOrUpdateFile(file));
    });

    const yesButton = screen.getByRole('button', { name: /Yes/i });
    act(() => {
      yesButton.click();
    });

    expect(setOpenConfirmDeleteDialog).toHaveBeenCalled();
  });

  it('handles cancel', () => {
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });

    act(() => {
      cancelButton.click();
    });

    expect(setOpenConfirmDeleteDialog).toHaveBeenCalled();
  });
});
