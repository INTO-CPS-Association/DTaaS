import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LogViewerHeader from 'page/logViewer/LogViewerHeader';

describe('LogViewerHeader', () => {
  const originalLoggerUrl = globalThis.env.LOGGER_URL;

  afterEach(() => {
    if (originalLoggerUrl === undefined) {
      delete globalThis.env.LOGGER_URL;
    } else {
      globalThis.env.LOGGER_URL = originalLoggerUrl;
    }
  });

  it('expands the description when the toggle button is clicked', () => {
    delete globalThis.env.LOGGER_URL;
    const { container } = render(<LogViewerHeader />);

    expect(container.querySelector('.MuiCollapse-hidden')).not.toBeNull();

    fireEvent.click(screen.getByLabelText('Toggle logs description'));

    expect(container.querySelector('.MuiCollapse-hidden')).toBeNull();
    expect(container.textContent).toContain('and never leave this device');
  });

  it('mentions the remote logging server when LOGGER_URL is configured', () => {
    globalThis.env.LOGGER_URL = 'https://logger.example.com';
    const { container } = render(<LogViewerHeader />);

    expect(container.textContent).toContain(
      "and are also sent to your organization's configured logging server",
    );
  });

  it('does not mention the remote logging server when LOGGER_URL is blank', () => {
    globalThis.env.LOGGER_URL = '   ';
    const { container } = render(<LogViewerHeader />);

    expect(container.textContent).toContain('and never leave this device');
  });

  it('does not instrument the description toggle for logging', () => {
    render(<LogViewerHeader />);

    expect(
      screen
        .getByLabelText('Toggle logs description')
        .hasAttribute('data-logger-element'),
    ).toBe(false);
  });
});
