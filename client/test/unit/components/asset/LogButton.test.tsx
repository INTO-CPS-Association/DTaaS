import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LogButton from 'components/asset/LogButton';

const mockSetShowLog = jest.fn();

describe('LogButton', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls setShowLog with the correct value when clicked', () => {
    render(
      <LogButton setShowLog={mockSetShowLog} logButtonDisabled={false} />
    );

    fireEvent.click(screen.getByText('Log'));

    expect(mockSetShowLog).toHaveBeenCalledTimes(1);
    expect(mockSetShowLog).toHaveBeenCalledWith(expect.any(Function));
    
    const toggleFunction = mockSetShowLog.mock.calls[0][0];
    expect(toggleFunction(true)).toBe(false);
  });

  it('disables button when logButtonDisabled is true', () => {
    render(<LogButton setShowLog={mockSetShowLog} logButtonDisabled={true} />);

    const button = screen.getByText('Log') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('enables button when logButtonDisabled is false', () => {
    render(<LogButton setShowLog={mockSetShowLog} logButtonDisabled={false} />);

    const button = screen.getByText('Log') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });
});