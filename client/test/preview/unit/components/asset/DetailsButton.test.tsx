import { screen, render, fireEvent } from '@testing-library/react';
import DetailsButton from 'preview/components/asset/DetailsButton';
import * as React from 'react';
import { Provider, useSelector } from 'react-redux';
import store from 'store/store';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('util/gitlabDigitalTwin', () => ({
  getFullDescription: jest.fn(),
}));

describe('DetailsButton', () => {
  const name = 'testName';
  const setShowLog = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Details button', () => {
    render(
      <Provider store={store}>
        <DetailsButton name={name} setShowLog={setShowLog} />,
      </Provider>,
    );

    expect(
      screen.getByRole('button', { name: /Details/i }),
    ).toBeInTheDocument();
  });

  it('handles button click', async () => {
    (useSelector as jest.Mock).mockReturnValue({
      getFullDescription: jest.fn(),
    });

    render(
      <Provider store={store}>
        <DetailsButton name={name} setShowLog={setShowLog} />,
      </Provider>,
    );

    const detailsButton = screen.getByRole('button', { name: /Details/i });
    await fireEvent.click(detailsButton);

    expect(setShowLog).toHaveBeenCalled();
  });
});
