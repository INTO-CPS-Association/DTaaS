import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DeleteButton from 'preview/components/asset//DeleteButton';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

describe('DeleteButton', () => {
  const setShowLog = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Delete button', () => {
    render(<DeleteButton setShowLog={setShowLog} />);

    expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument();
  });

  it('handles button click', async () => {
    render(<DeleteButton setShowLog={setShowLog} />);

    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    await fireEvent.click(deleteButton);

    expect(setShowLog).toHaveBeenCalled();
  });
});
