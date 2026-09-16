import CreatePage from 'route/digitaltwins/create/CreatePage';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import {
  digitalTwinSlice as digitalTwinReducer,
  fileSlice,
  cartSlice,
} from '@into-cps-association/dt-automation';
import snackbarSlice from 'store/snackbar.slice';

const store = configureStore({
  reducer: combineReducers({
    digitalTwin: digitalTwinReducer,
    snackbar: snackbarSlice,
    files: fileSlice,
    cart: cartSlice,
  }),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

describe('CreatePage', () => {
  const setNewDigitalTwinName = jest.fn();

  beforeEach(() => {
    act(() => {
      render(
        <Provider store={store}>
          <CreatePage
            newDigitalTwinName="newDTName"
            setNewDigitalTwinName={setNewDigitalTwinName}
          />
        </Provider>,
      );
    });
  });

  it('handles cancel when clicking on cancel button and confirm', () => {
    act(() => {
      screen.getByText('Cancel').click();
    });

    expect(
      screen.getByText(
        'Are you sure you want to delete the inserted files and their content?',
      ),
    ).toBeInTheDocument();

    act(() => {
      screen.getByText('Yes').click();
    });

    expect(setNewDigitalTwinName).toHaveBeenCalled();
  });

  it('opens confirm dialog when clicking on save button', () => {
    act(() => {
      screen.getByText('Save').click();
    });

    expect(
      screen.getByText(/Are you sure you want to create/i),
    ).toBeInTheDocument();
  });

  it('changes the digital twin name', () => {
    const textField = screen.getByRole('textbox');

    act(() => {
      fireEvent.change(textField, {
        target: { value: 'modifiedDTName' },
      });
    });

    waitFor(() => {
      expect(textField).toHaveValue('modifiedDTName');
    });
    expect(setNewDigitalTwinName).toHaveBeenCalled();
  });
});
