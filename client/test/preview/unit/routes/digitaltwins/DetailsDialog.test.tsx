import DetailsDialog from 'preview/route/digitaltwins/manage/DetailsDialog';
import * as React from 'react';
import { Provider, useSelector } from 'react-redux';
import store from 'store/store';
import { render, screen } from '@testing-library/react';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('remarkable');

describe('DetailsDialog', () => {
  const name = 'testName';
  const setShowLog = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the DetailsDialog', () => {
    (useSelector as jest.Mock).mockReturnValue({
      fullDescription: jest.fn(),
    });

    render(
      <Provider store={store}>
        <DetailsDialog name={name} showLog={true} setShowLog={setShowLog} />
      </Provider>,
    );

    expect(screen.getByRole('button', { name: /Close/i })).toBeInTheDocument();
  });

  it('handles close button click', () => {
    (useSelector as jest.Mock).mockReturnValue({
      fullDescription: jest.fn(),
    });

    render(
      <Provider store={store}>
        <DetailsDialog name={name} showLog={true} setShowLog={setShowLog} />
      </Provider>,
    );

    const closeButton = screen.getByRole('button', { name: /Close/i });
    closeButton.click();

    expect(setShowLog).toHaveBeenCalled();
  });
});
