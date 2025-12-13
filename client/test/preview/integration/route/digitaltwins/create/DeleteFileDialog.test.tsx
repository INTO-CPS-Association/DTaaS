import DeleteFileDialog from 'preview/route/digitaltwins/create/DeleteFileDialog';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import fileSlice from 'preview/store/file.slice';
import { act } from 'react';

const store = configureStore({
  reducer: combineReducers({
    files: fileSlice,
  }),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

describe('DeleteFileDialog', () => {
  const setOpenDeleteFileDialog = jest.fn();
  const setFileName = jest.fn();
  const setFileContent = jest.fn();

  beforeEach(() => {
    act(() => {
      render(
        <Provider store={store}>
          <DeleteFileDialog
            open={true}
            setOpenDeleteFileDialog={setOpenDeleteFileDialog}
            fileName="testName"
            setFileName={setFileName}
            setFileContent={setFileContent}
          />
        </Provider>,
      );
    });
  });

  it('handles click on yes button', () => {
    const yesButton = screen.getByRole('button', { name: /Yes/i });
    act(() => {
      yesButton.click();
    });

    expect(setFileName).toHaveBeenCalled();
    expect(setFileContent).toHaveBeenCalled();
  });

  it('handles click on no button', () => {
    const noButton = screen.getByRole('button', { name: /No/i });
    act(() => {
      noButton.click();
    });

    expect(setOpenDeleteFileDialog).toHaveBeenCalled();
  });
});
