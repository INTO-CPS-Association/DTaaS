import ChangeFileNameDialog from 'preview/route/digitaltwins/create/ChangeFileNameDialog';
import { Provider } from 'react-redux';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import fileSlice from 'preview/store/file.slice';

const store = configureStore({
  reducer: combineReducers({
    files: fileSlice,
  }),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

describe('ChangeFileNameDialog', () => {
  const setShowDialog = jest.fn();
  const setFileName = jest.fn();
  const setFileType = jest.fn();
  const fileName = 'testName';

  beforeEach(() => {
    act(() => {
      render(
        <Provider store={store}>
          <ChangeFileNameDialog
            open={true}
            setOpenChangeFileNameDialog={setShowDialog}
            fileName={fileName}
            setFileName={setFileName}
            setFileType={setFileType}
          />
        </Provider>,
      );
    });
  });

  it('handles click on change button', () => {
    const changeButton = screen.getByRole('button', { name: /Change/i });
    act(() => {
      changeButton.click();
    });

    expect(setFileName).toHaveBeenCalled();
    expect(setFileType).toHaveBeenCalled();
  });

  it('handles click on cancel button', () => {
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    act(() => {
      cancelButton.click();
    });

    expect(setShowDialog).toHaveBeenCalled();
  });

  it('handles change in text field', () => {
    const textField = screen.getByRole('textbox');

    act(() => {
      fireEvent.change(textField, {
        target: { value: 'modifiedDTName' },
      });
    });

    waitFor(() => {
      expect(textField).toHaveValue('modifiedDTName');
    });
  });
});
