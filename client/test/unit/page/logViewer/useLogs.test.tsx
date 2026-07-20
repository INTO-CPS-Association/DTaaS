import { act, renderHook, waitFor } from '@testing-library/react';
import useLogs from 'page/logViewer/useLogs';
import * as indexedDBLogger from 'util/logger/indexedDBLogger';
import { LogEvent } from 'util/logger/logEvent';

jest.mock('util/logger/indexedDBLogger');

const mockGetAllLogs = indexedDBLogger.getAllLogs as jest.MockedFunction<
  typeof indexedDBLogger.getAllLogs
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
];

describe('useLogs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllLogs.mockResolvedValue(mockEvents);
    mockSubscribeToLogChanges.mockReturnValue(jest.fn());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('schedules only one initial load when live update starts enabled', async () => {
    renderHook(() => useLogs(true));

    await waitFor(() => {
      expect(mockGetAllLogs).toHaveBeenCalledTimes(1);
    });
    expect(mockSubscribeToLogChanges).toHaveBeenCalledTimes(1);
  });

  it('coalesces bursts of change notifications into a single reload', async () => {
    jest.useFakeTimers();
    let notifyChange: (() => void) | undefined;
    mockSubscribeToLogChanges.mockImplementation((listener) => {
      notifyChange = listener;
      return jest.fn();
    });

    renderHook(() => useLogs(true));
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    expect(mockGetAllLogs).toHaveBeenCalledTimes(1);

    act(() => {
      notifyChange?.();
      notifyChange?.();
      notifyChange?.();
    });
    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    expect(mockGetAllLogs).toHaveBeenCalledTimes(2);
  });
});
