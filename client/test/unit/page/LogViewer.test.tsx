import 'fake-indexeddb/auto';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LogViewer from 'page/LogViewer';
import * as indexedDBLogger from 'util/logger/indexedDBLogger';
import { LogEvent } from 'util/logger/logEvent';

jest.mock('util/logger/indexedDBLogger');

const mockGetAllLogs = indexedDBLogger.getAllLogs as jest.MockedFunction<
  typeof indexedDBLogger.getAllLogs
>;
const mockClearLogs = indexedDBLogger.clearLogs as jest.MockedFunction<
  typeof indexedDBLogger.clearLogs
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

    globalThis.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    globalThis.URL.revokeObjectURL = jest.fn();
  });

  it('displays log entries after loading', async () => {
    render(<LogViewer />);

    await waitFor(() => {
      expect(screen.getByTestId('log-content')).toBeInTheDocument();
    });

    const content = screen.getByTestId('log-content').textContent!;
    expect(content).toContain('Functions');
    expect(content).toContain('Private');
  });

  it('shows log entry count', async () => {
    render(<LogViewer />);

    await waitFor(() => {
      expect(screen.getByText('2 log entries')).toBeInTheDocument();
    });
  });

  it('clears logs when clear button is clicked', async () => {
    render(<LogViewer />);

    await waitFor(() => {
      expect(screen.getByTestId('clear-logs')).toBeEnabled();
    });

    mockGetAllLogs.mockResolvedValue([]);
    fireEvent.click(screen.getByTestId('clear-logs'));

    await waitFor(() => {
      expect(mockClearLogs).toHaveBeenCalled();
    });
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
});
