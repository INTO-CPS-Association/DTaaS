import 'fake-indexeddb/auto';
import {
  act,
  render,
  screen,
  waitFor,
  fireEvent,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import LogViewer from 'page/LogViewer';
import * as indexedDBLogger from 'util/logger/indexedDBLogger';
import { LogEvent } from 'util/logger/logEvent';

jest.mock('util/logger/indexedDBLogger');

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

describe('LogViewer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllLogs.mockResolvedValue(mockEvents);
    mockClearLogs.mockResolvedValue(undefined);
    mockSubscribeToLogChanges.mockReturnValue(jest.fn());

    globalThis.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    globalThis.URL.revokeObjectURL = jest.fn();
  });

  it('displays log entries after loading', async () => {
    render(<LogViewer />);

    await waitFor(() => {
      expect(screen.getByTestId('log-content')).toBeInTheDocument();
    });

    const content = screen.getByTestId('log-content').textContent;
    expect(content).toContain('Functions');
    expect(content).toContain('Private');
  });

  it('shows entry details in dedicated cards', async () => {
    render(<LogViewer />);

    await waitFor(() => {
      expect(screen.getByTestId('log-content')).toBeInTheDocument();
    });

    expect(screen.getByText('subtab')).toBeInTheDocument();
    expect(screen.getAllByText(/\/library/).length).toBeGreaterThan(0);
    expect(screen.getByText('tab: functions')).toBeInTheDocument();
  });

  it('shows newest log entries first', async () => {
    render(<LogViewer />);

    await waitFor(() => {
      expect(screen.getByTestId('log-content')).toBeInTheDocument();
    });

    const content = screen.getByTestId('log-content').textContent ?? '';
    expect(content.indexOf('Private')).toBeLessThan(
      content.indexOf('Functions'),
    );
  });

  it('shows log entry count', async () => {
    render(<LogViewer />);

    await waitFor(() => {
      expect(screen.getByText('2 log entries')).toBeInTheDocument();
    });
  });

  it('asks for confirmation before clearing logs', async () => {
    render(<LogViewer />);

    await waitFor(() => {
      expect(screen.getByTestId('clear-logs')).toBeEnabled();
    });

    fireEvent.click(screen.getByTestId('clear-logs'));

    expect(screen.getByText('Clear all logs?')).toBeInTheDocument();
    expect(mockClearLogs).not.toHaveBeenCalled();

    mockGetAllLogs.mockResolvedValue([]);
    fireEvent.click(screen.getByTestId('confirm-clear-logs'));

    await waitFor(() => {
      expect(mockClearLogs).toHaveBeenCalled();
    });
  });

  it('keeps logs when clearing is cancelled', async () => {
    render(<LogViewer />);

    await waitFor(() => {
      expect(screen.getByTestId('clear-logs')).toBeEnabled();
    });

    fireEvent.click(screen.getByTestId('clear-logs'));
    fireEvent.click(screen.getByTestId('cancel-clear-logs'));

    await waitFor(() => {
      expect(screen.queryByText('Clear all logs?')).not.toBeInTheDocument();
    });
    expect(mockClearLogs).not.toHaveBeenCalled();
  });

  it('shows empty state when no logs', async () => {
    mockGetAllLogs.mockResolvedValue([]);
    render(<LogViewer />);

    await waitFor(() => {
      expect(screen.getByText('No log entries found.')).toBeInTheDocument();
    });
  });

  it('triggers download when download button is clicked', async () => {
    render(<LogViewer />);

    await waitFor(() => {
      expect(screen.getByTestId('download-logs')).toBeEnabled();
    });

    const mockClick = jest.fn();
    const origCreateElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = origCreateElement(tag);
      if (tag === 'a') {
        el.click = mockClick;
      }
      return el;
    });

    fireEvent.click(screen.getByTestId('download-logs'));
    expect(mockClick).toHaveBeenCalled();

    jest.restoreAllMocks();
  });

  it('refreshes logs when refresh button is clicked', async () => {
    render(<LogViewer />);

    await waitFor(() => {
      expect(screen.getByTestId('refresh-logs')).toBeInTheDocument();
    });

    mockGetAllLogs.mockResolvedValue([mockEvents[0]]);
    fireEvent.click(screen.getByTestId('refresh-logs'));

    await waitFor(() => {
      expect(screen.getByText('1 log entries')).toBeInTheDocument();
    });
  });

  it('subscribes to database changes when live update is enabled', async () => {
    render(<LogViewer />);

    await waitFor(() => {
      expect(screen.getByTestId('live-update-logs')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('live-update-logs'));

    await waitFor(() => {
      expect(mockSubscribeToLogChanges).toHaveBeenCalled();
    });
  });

  it('filters log entries by search text', async () => {
    render(<LogViewer />);

    await waitFor(() => {
      expect(screen.getByTestId('log-content')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Filter logs'), {
      target: { value: 'subtab' },
    });

    expect(screen.getByText('1 of 2 log entries')).toBeInTheDocument();
    const content = screen.getByTestId('log-content').textContent ?? '';
    expect(content).toContain('Private');
    expect(content).not.toContain('Functions');
  });

  it('shows a message when no entries match the filter', async () => {
    render(<LogViewer />);

    await waitFor(() => {
      expect(screen.getByTestId('log-content')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Filter logs'), {
      target: { value: 'no-such-entry' },
    });

    expect(
      screen.getByText('No entries match the current filter.'),
    ).toBeInTheDocument();
  });

  it('refreshes logs after a subscribed database change', async () => {
    let listener: () => void | Promise<void> = () => {};
    mockSubscribeToLogChanges.mockImplementation((callback) => {
      listener = callback;
      return jest.fn();
    });
    mockGetAllLogs
      .mockResolvedValueOnce(mockEvents)
      .mockResolvedValueOnce(mockEvents)
      .mockResolvedValueOnce([mockEvents[0]]);

    render(<LogViewer />);

    await waitFor(() => {
      expect(screen.getByText('2 log entries')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('live-update-logs'));
    await waitFor(() => expect(mockSubscribeToLogChanges).toHaveBeenCalled());
    await act(async () => listener());

    await waitFor(() => {
      expect(screen.getByText('1 log entries')).toBeInTheDocument();
    });
  });
});
