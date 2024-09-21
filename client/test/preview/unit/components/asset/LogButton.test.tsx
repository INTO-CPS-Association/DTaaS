import { screen, render, fireEvent } from '@testing-library/react';
import LogButton from 'preview/components/asset/LogButton';
import * as React from 'react';
import { Provider } from 'react-redux';
import store from 'store/store';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

describe('LogButton', () => {
  const setShowLog = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Log button', () => {
    render(
      <Provider store={store}>
        <LogButton setShowLog={setShowLog} logButtonDisabled={false} />
      </Provider>,
    );
    expect(screen.getByRole('button', { name: /Log/i })).toBeInTheDocument();
  });

  it('handles button click when enabled', () => {
    render(
      <Provider store={store}>
        <LogButton setShowLog={setShowLog} logButtonDisabled={false} />
      </Provider>,
    );

    const logButton = screen.getByRole('button', { name: /Log/i });
    fireEvent.click(logButton);

    expect(setShowLog).toHaveBeenCalled();
  });

  it('does not handle button click when disabled', () => {
    render(
      <Provider store={store}>
        <LogButton setShowLog={setShowLog} logButtonDisabled={true} />
      </Provider>,
    );

    const logButton = screen.getByRole('button', { name: /Log/i });
    fireEvent.click(logButton);

    expect(setShowLog).not.toHaveBeenCalled();
  });
});
