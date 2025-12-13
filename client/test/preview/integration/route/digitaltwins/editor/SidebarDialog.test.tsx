import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SidebarDialog from 'preview/route/digitaltwins/editor/SidebarDialog';
import fileSlice from 'preview/store/file.slice';
import { act } from 'react';
import { Provider } from 'react-redux';

const store = configureStore({
  reducer: combineReducers({
    files: fileSlice,
  }),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

describe('SidebarDialog', () => {
  const setNewFileName = jest.fn();
  const setIsFileNameDialogOpen = jest.fn();
  const setErrorMessage = jest.fn();

  beforeEach(() => {
    act(() => {
      render(
        <Provider store={store}>
          <SidebarDialog
            isOpen={true}
            newFileName={'newFileName'}
            setNewFileName={setNewFileName}
            setIsFileNameDialogOpen={setIsFileNameDialogOpen}
            errorMessage={'errorMessage'}
            setErrorMessage={setErrorMessage}
            files={[]}
            dispatch={store.dispatch}
          />
        </Provider>,
      );
    });
  });

  it('should handle click on cancel button', () => {
    const cancelButton = screen.getByText('Cancel');

    act(() => {
      cancelButton.click();
    });

    expect(setIsFileNameDialogOpen).toHaveBeenCalledTimes(1);
    expect(setNewFileName).toHaveBeenCalledTimes(1);
    expect(setErrorMessage).toHaveBeenCalledTimes(1);
  });

  it('should handle click on add button', () => {
    const addButton = screen.getByText('Add');

    act(() => {
      addButton.click();
    });

    expect(setErrorMessage).toHaveBeenCalledTimes(1);
  });

  it('should handle change in file name', () => {
    const textField = screen.getByRole('textbox');

    act(() => {
      fireEvent.change(textField, {
        target: { value: 'modifiedFileName' },
      });
    });

    waitFor(() => {
      expect(textField).toHaveValue('modifiedFileName');
    });

    expect(setNewFileName).toHaveBeenCalledTimes(1);
  });
});
