import 'fake-indexeddb/auto';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useDispatch } from 'react-redux';
import LogViewer from 'page/LogViewer';
import { toDisplayJsonLines } from 'page/logViewer/logViewerUtils';
import { showSnackbar } from 'store/snackbar.slice';
import * as indexedDBLogger from 'util/logger/indexedDBLogger';
import { LogEvent } from 'util/logger/logEvent';

jest.mock('util/logger/indexedDBLogger');

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
}));

jest.mock('page/Layout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-layout">{children}</div>
  ),
}));

const mockGetAllLogs = indexedDBLogger.getAllLogs as jest.MockedFunction<
  typeof indexedDBLogger.getAllLogs
>;
const mockClearLogs = indexedDBLogger.clearLogs as jest.MockedFunction<
  typeof indexedDBLogger.clearLogs
>;
const mockSubscribeToLogChanges =
  indexedDBLogger.subscribeToLogChanges as jest.MockedFunction<
    typeof indexedDBLogger.subscribeToLogChanges
  >;

const mockEvents: LogEvent[] = [
  {
    sessionId: 'sess-1',
    userHash: 'hash-1',
    timestamp: '2026-03-24T20:00:00.000Z',
    event: 'click',
    page: '/library',
    element: 'tab',
    label: 'Functions',
    context: {},
  },
  {
    sessionId: 'sess-1',
    userHash: 'hash-1',
    timestamp: '2026-03-24T20:01:00.000Z',
    event: 'click',
    page: '/library',
    element: 'subtab',
    label: 'Private',
    context: { tab: 'functions' },
  },
];

describe('LogViewer raw view', () => {
  let mockDispatch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllLogs.mockResolvedValue(mockEvents);
    mockClearLogs.mockResolvedValue(undefined);
    mockSubscribeToLogChanges.mockReturnValue(jest.fn());
    mockDispatch = jest.fn();
    (useDispatch as unknown as jest.Mock).mockReturnValue(mockDispatch);
  });

  it('shows raw JSON lines when raw view is toggled', async () => {
    render(<LogViewer />);

    await waitFor(() => {
      expect(screen.getByTestId('log-content')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('raw-view-toggle'));

    const raw = screen.getByTestId('raw-log-content').textContent ?? '';
    expect(raw).toContain('"event": "click"');
    expect(raw).toContain('"sessionId": "sess-1"');
    expect(screen.queryByText('tab: functions')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('raw-view-toggle'));
    expect(screen.queryByTestId('raw-log-content')).not.toBeInTheDocument();
    expect(screen.getByText('tab: functions')).toBeInTheDocument();
  });

  it('applies the filter to the raw view', async () => {
    render(<LogViewer />);

    await waitFor(() => {
      expect(screen.getByTestId('log-content')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('raw-view-toggle'));
    fireEvent.change(screen.getByPlaceholderText('Filter logs'), {
      target: { value: 'subtab' },
    });

    const raw = screen.getByTestId('raw-log-content').textContent ?? '';
    expect(raw).toContain('Private');
    expect(raw).not.toContain('Functions');
  });

  it('does not instrument the copy button for logging', async () => {
    render(<LogViewer />);

    await waitFor(() => {
      expect(screen.getByTestId('log-content')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('raw-view-toggle'));

    expect(
      screen.getByTestId('copy-logs').hasAttribute('data-logger-element'),
    ).toBe(false);
  });

  it('copies raw logs to the clipboard', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(<LogViewer />);

    await waitFor(() => {
      expect(screen.getByTestId('log-content')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('raw-view-toggle'));
    fireEvent.click(screen.getByTestId('copy-logs'));

    expect(writeText).toHaveBeenCalledWith(
      toDisplayJsonLines([mockEvents[1], mockEvents[0]]),
    );

    await waitFor(() => {
      expect(screen.getByText('Copied')).toBeInTheDocument();
    });
  });

  it('shows an error snackbar when copying to the clipboard fails', async () => {
    const writeText = jest.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(<LogViewer />);

    await waitFor(() => {
      expect(screen.getByTestId('log-content')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('raw-view-toggle'));
    fireEvent.click(screen.getByTestId('copy-logs'));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        showSnackbar({
          message: 'Could not copy logs to clipboard.',
          severity: 'error',
        }),
      );
    });
    expect(screen.queryByText('Copied')).not.toBeInTheDocument();
  });
});
