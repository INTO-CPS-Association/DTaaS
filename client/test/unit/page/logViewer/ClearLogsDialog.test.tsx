import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClearLogsDialog from 'page/logViewer/ClearLogsDialog';

describe('ClearLogsDialog', () => {
  const onCancel = jest.fn();
  const onConfirm = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('cancels without logging when dismissed via Escape', () => {
    render(
      <ClearLogsDialog
        open
        logCount={3}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('does not render logger data attributes on its buttons', () => {
    render(
      <ClearLogsDialog
        open
        logCount={3}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    expect(
      screen
        .getByTestId('cancel-clear-logs')
        .hasAttribute('data-logger-element'),
    ).toBe(false);
    expect(
      screen
        .getByTestId('confirm-clear-logs')
        .hasAttribute('data-logger-element'),
    ).toBe(false);
  });
});
