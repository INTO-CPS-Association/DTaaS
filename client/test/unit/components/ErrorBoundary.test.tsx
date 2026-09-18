import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from 'components/ErrorBoundary';

function Throws(): never {
  throw new Error('render failed');
}

describe('ErrorBoundary', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    // React prints the caught error itself, and the boundary logs it too. Both
    // are expected here, so the output is silenced instead of read.
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('renders its children while nothing throws', () => {
    render(
      <ErrorBoundary>
        <div>The application</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText('The application')).toBeInTheDocument();
  });

  it('renders the fallback instead of a blank page when a child throws', () => {
    render(
      <ErrorBoundary>
        <Throws />
      </ErrorBoundary>,
    );

    expect(
      screen.getByRole('heading', { name: 'Something went wrong' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
  });

  it('says what to do and not what went wrong', () => {
    render(
      <ErrorBoundary>
        <Throws />
      </ErrorBoundary>,
    );

    // The message a person can act on, and no trace of the thrown error.
    expect(screen.getByText(/Reload the page/)).toBeInTheDocument();
    expect(screen.queryByText(/render failed/)).toBeNull();
  });

  it('logs the error for a developer', () => {
    render(
      <ErrorBoundary>
        <Throws />
      </ErrorBoundary>,
    );

    expect(consoleError).toHaveBeenCalledWith(
      'The application stopped rendering.',
      expect.any(Error),
      expect.anything(),
    );
  });
});
