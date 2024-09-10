import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LogDialog from 'route/digitaltwins/LogDialog';

describe('LogDialog', () => {
  it('renders the dialog with job logs', () => {
    render(
      <LogDialog showLog={true} setShowLog={jest.fn()} name="Test Name" />,
    );

    expect(screen.getByText('Test Name - log (run #1)')).toBeInTheDocument();
    expect(screen.getByText('Job 1')).toBeInTheDocument();
    expect(screen.getByText('Log for Job 1')).toBeInTheDocument();
    expect(screen.getByText('Job 2')).toBeInTheDocument();
    expect(screen.getByText('Log for Job 2')).toBeInTheDocument();
  });

  it('renders "No logs available" when no job logs are provided', () => {
    render(
      <LogDialog showLog={true} setShowLog={jest.fn()} name="Test Name" />,
    );

    expect(screen.getByText('No logs available')).toBeInTheDocument();
  });

  it('closes the dialog when the close button is clicked', () => {
    const setShowLog = jest.fn();
    render(
      <LogDialog showLog={true} setShowLog={setShowLog} name="Test Name" />,
    );

    fireEvent.click(screen.getByText('Close'));
    expect(setShowLog).toHaveBeenCalledTimes(1);
    expect(setShowLog).toHaveBeenCalledWith(false);
  });

  it('does not render the dialog when showLog is false', () => {
    const { container } = render(
      <LogDialog showLog={false} setShowLog={jest.fn()} name="Test Name" />,
    );

    expect(container.querySelector('div')).toBeNull(); // No dialog should be present
  });

  it('calls handleCloseLog when dialog is closed', () => {
    const setShowLog = jest.fn();
    render(
      <LogDialog showLog={true} setShowLog={setShowLog} name="Test Name" />,
    );

    // Simulate dialog close event by clicking the close button
    fireEvent.click(screen.getByText('Close'));
    expect(setShowLog).toHaveBeenCalledWith(false);

    // Simulate dialog backdrop close event (if applicable)
    fireEvent.click(document.querySelector('[role="dialog"]')!); // Assuming clicking outside also closes
    expect(setShowLog).toHaveBeenCalledWith(false);
  });
});
