import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import DetailsDialog from 'route/digitaltwins/DetailsDialog';
import DigitalTwin from 'util/gitlabDigitalTwin';
import { selectDigitalTwinByName } from 'store/digitalTwin.slice';

jest.mock('store/digitalTwin.slice', () => ({
  selectDigitalTwinByName: jest.fn(),
}));

const middlewares = [thunk];
const mockStore = configureStore(middlewares);

describe('DetailsDialog', () => {
  let store: any;
  let setShowLogMock: jest.Mock;

  beforeEach(() => {
    store = mockStore({
      digitalTwin: {},
    });
    setShowLogMock = jest.fn();
  });

  it('should render the dialog and display the digital twin name', () => {
    const digitalTwin = new DigitalTwin('testDT', {});
    (selectDigitalTwinByName as jest.Mock).mockReturnValue(digitalTwin);

    render(
      <Provider store={store}>
        <DetailsDialog
          showLog={true}
          setShowLog={setShowLogMock}
          name="testDT"
        />
      </Provider>,
    );

    expect(
      screen.getByText(/Would you like to delete testDT digital twin?/i),
    ).toBeInTheDocument();
  });

  it('should close the dialog when the cancel button is clicked', () => {
    render(
      <Provider store={store}>
        <DetailsDialog
          showLog={true}
          setShowLog={setShowLogMock}
          name="testDT"
        />
      </Provider>,
    );

    fireEvent.click(screen.getByText(/Cancel/i));
    expect(setShowLogMock).toHaveBeenCalledWith(false);
  });

  it('should call the delete method and close the dialog when Yes is clicked', async () => {
    const deleteMock = jest.fn();
    const digitalTwin = { delete: deleteMock } as unknown as DigitalTwin;
    (selectDigitalTwinByName as jest.Mock).mockReturnValue(digitalTwin);

    render(
      <Provider store={store}>
        <DetailsDialog
          showLog={true}
          setShowLog={setShowLogMock}
          name="testDT"
        />
      </Provider>,
    );

    fireEvent.click(screen.getByText(/Yes/i));
    expect(deleteMock).toHaveBeenCalled();
    expect(setShowLogMock).toHaveBeenCalledWith(false);
  });
});
