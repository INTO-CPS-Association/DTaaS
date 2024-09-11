import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DetailsButton from 'components/asset/DetailsButton';
import { Provider, useSelector } from 'react-redux';
import store from 'store/store';
import '@testing-library/jest-dom';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('store/digitalTwin.slice', () => ({
  ...jest.requireActual('store/digitalTwin.slice'),
  selectDigitalTwinByName: jest.fn(),
}));

const digitalTwinMock = {
  getFullDescription: jest.fn(() => Promise.resolve('Full Description Mock')),
};

describe('DetailsButton', () => {
  const setShowLogMock = jest.fn();

  beforeEach(() => {
    (useSelector as jest.Mock).mockReturnValue(digitalTwinMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Details button correctly', () => {
    render(
      <Provider store={store}>
        <DetailsButton name="testName" setShowLog={setShowLogMock} />
      </Provider>,
    );

    const button = screen.getByRole('button', { name: /Details/i });
    expect(button).toBeInTheDocument();
  });

  it('calls setShowLog with true after clicking the button and getting the description', async () => {
    render(
      <Provider store={store}>
        <DetailsButton name="testName" setShowLog={setShowLogMock} />
      </Provider>,
    );

    const button = screen.getByRole('button', { name: /Details/i });

    fireEvent.click(button);

    await waitFor(() => expect(digitalTwinMock.getFullDescription).toHaveBeenCalled());

    expect(setShowLogMock).toHaveBeenCalledWith(true);
  });
});
