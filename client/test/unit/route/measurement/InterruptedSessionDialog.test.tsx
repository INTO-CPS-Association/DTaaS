import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import InterruptedSessionDialog from 'route/measurement/InterruptedSessionDialog';
import { logDismiss } from 'util/logger/logger';

jest.mock('util/logger/logger', () => ({
  logDismiss: jest.fn(),
}));

describe('InterruptedSessionDialog', () => {
  const onClose = jest.fn();

  it('closes when the OK button is clicked', () => {
    render(<InterruptedSessionDialog open onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'OK' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('logs the dismissal and closes when dismissed via Escape', () => {
    render(<InterruptedSessionDialog open onClose={onClose} />);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(logDismiss).toHaveBeenCalledWith({
      element: 'dialog',
      label: 'Previous Session Interrupted',
      reason: 'escapeKeyDown',
    });
    expect(onClose).toHaveBeenCalled();
  });
});
