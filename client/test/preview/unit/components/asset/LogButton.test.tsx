import { screen, render, fireEvent } from '@testing-library/react';
import LogButton from 'preview/components/asset/LogButton';
import * as React from 'react';
import { Provider } from 'react-redux';
import store from 'store/store';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

describe('LogButton', () => {

  const renderLogButton = (setShowLog: jest.Mock = jest.fn(), logButtonDisabled = false) => {
    return render(
      <Provider store={store}>
        <LogButton setShowLog={setShowLog} logButtonDisabled={logButtonDisabled} />
      </Provider>,
    );
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Log button', () => {
    renderLogButton();
    expect(screen.getByRole('button', { name: /Log/i })).toBeInTheDocument();
  });

  it('handles button click when enabled', () => {
    renderLogButton();

    const logButton = screen.getByRole('button', { name: /Log/i });
    fireEvent.click(logButton);

    expect(logButton).toBeEnabled();
  });

  it('does not handle button click when disabled', () => {
    renderLogButton(jest.fn(), true);

    const logButton = screen.getByRole('button', { name: /Log/i });
    fireEvent.click(logButton);
  });

  it('toggles setShowLog value correctly', () => {
    let toggleValue = false;
    const mockSetShowLog = jest.fn((callback) => {
      toggleValue = callback(toggleValue);
    });

    renderLogButton(mockSetShowLog);

    const logButton = screen.getByRole('button', { name: /Log/i });

    fireEvent.click(logButton);
    expect(toggleValue).toBe(true);

    fireEvent.click(logButton);
    expect(toggleValue).toBe(false);
  });
});
