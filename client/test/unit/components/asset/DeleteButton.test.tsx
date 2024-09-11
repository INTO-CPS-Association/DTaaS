import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DeleteButton from 'components/asset//DeleteButton';

describe('DeleteButton', () => {
  const setShowLogMock = jest.fn();

  const defaultProps = {
    setShowLog: setShowLogMock,
  };

  it('should render the Delete button', () => {
    render(<DeleteButton {...defaultProps} />);

    const button = screen.getByRole('button', { name: /delete/i });
    expect(button).toBeInTheDocument();
  });

  it('should call setShowLog with true when button is clicked', () => {
    render(<DeleteButton {...defaultProps} />);

    const button = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(button);

    expect(setShowLogMock).toHaveBeenCalledWith(true);
  });
});
