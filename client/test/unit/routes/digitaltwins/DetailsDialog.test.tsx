import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DetailsDialog from 'route/digitaltwins/DetailsDialog';

describe('DetailsDialog', () => {
  const setShowLogMock = jest.fn();

  const defaultProps = {
    showLog: true,
    setShowLog: setShowLogMock,
    name: 'Test Name',
    fullDescription: '# Test Description',
  };

  it('should render dialog with full description', () => {
    render(<DetailsDialog {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('should close the dialog when Close button is clicked', () => {
    render(<DetailsDialog {...defaultProps} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    expect(closeButton).toBeInTheDocument();

    fireEvent.click(closeButton);

    expect(setShowLogMock).toHaveBeenCalledWith(false);
  });

  it('should call handleCloseLog when dialog is closed by backdrop click', () => {
    render(<DetailsDialog {...defaultProps} />);

    fireEvent.click(document.body);

    expect(setShowLogMock).toHaveBeenCalledWith(false);
  });

  it('should not render when showLog is false', () => {
    render(<DetailsDialog {...defaultProps} showLog={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
