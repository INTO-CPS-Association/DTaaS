import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import DetailsDialog from 'route/digitaltwins/DetailsDialog';
import DigitalTwin from 'util/gitlabDigitalTwin';
import { selectDigitalTwinByName } from 'store/digitalTwin.slice';
import { GitlabInstance } from 'util/gitlab';
import store from 'store/store';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

jest.mock('store/digitalTwin.slice', () => ({
  selectDigitalTwinByName: jest.fn(),
}));

describe('DetailsDialog', () => {
  let setShowLogMock: jest.Mock;

  const renderComponent = (props: { showLog: boolean; name: string }) => render(
      <Provider store={store}>
        <DetailsDialog
          showLog={props.showLog}
          setShowLog={setShowLogMock}
          name={props.name}
        />
      </Provider>,
    );

  beforeEach(() => {
    setShowLogMock = jest.fn();
  });

  it('should render the dialog and display the digital twin name', () => {
    const gitlabInstance = new GitlabInstance('user1', 'authority', 'token1');
    const digitalTwin = new DigitalTwin('testDT', gitlabInstance);
    (selectDigitalTwinByName as jest.Mock).mockReturnValue(digitalTwin);

    renderComponent({ showLog: true, name: 'testDT' });

    expect(
      screen.getByText(/Would you like to delete testDT digital twin?/i),
    ).toBeInTheDocument();
  });

  it('should close the dialog when the cancel button is clicked', () => {
    renderComponent({ showLog: true, name: 'testDT' });

    fireEvent.click(screen.getByText(/Cancel/i));
    expect(setShowLogMock).toHaveBeenCalledWith(false);
  });

  it('should call the delete method and close the dialog when Yes is clicked', async () => {
    const deleteMock = jest.fn();
    const digitalTwin = { delete: deleteMock } as unknown as DigitalTwin;
    (selectDigitalTwinByName as jest.Mock).mockReturnValue(digitalTwin);

    renderComponent({ showLog: true, name: 'testDT' });

    fireEvent.click(screen.getByText(/Yes/i));
    expect(deleteMock).toHaveBeenCalled();
    expect(setShowLogMock).toHaveBeenCalledWith(false);
  });
});
