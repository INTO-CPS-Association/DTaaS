import 'fake-indexeddb/auto';
import {
  addLog,
  getAllLogs,
  clearLogs,
  subscribeToLogChanges,
  resetDBConnection,
} from 'util/logger/indexedDBLogger';
import { LogEvent } from 'util/logger/logEvent';

// Polyfill for jsdom environment
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = <T>(val: T): T =>
    JSON.parse(JSON.stringify(val)) as T;
}

const mockEvent: LogEvent = {
  sessionId: 'sess-1',
  userHash: 'hash-1',
  timestamp: '2026-03-24T20:00:00.000Z',
  event: 'click',
  page: '/library',
  element: 'tab',
  label: 'Functions',
  context: {},
};

describe('indexedDBLogger', () => {
  beforeEach(async () => {
    resetDBConnection();
    await clearLogs();
  });

  afterAll(() => {
    resetDBConnection();
  });

  it('adds a log event and retrieves it', async () => {
    await addLog(mockEvent);
    const logs = await getAllLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].sessionId).toBe('sess-1');
    expect(logs[0].page).toBe('/library');
    expect(logs[0].element).toBe('tab');
    expect(logs[0].label).toBe('Functions');
  });

  it('retrieves multiple log events in order', async () => {
    const event2: LogEvent = {
      ...mockEvent,
      timestamp: '2026-03-24T21:00:00.000Z',
      label: 'Models',
    };
    await addLog(mockEvent);
    await addLog(event2);
    const logs = await getAllLogs();
    expect(logs).toHaveLength(2);
    expect(logs[0].label).toBe('Functions');
    expect(logs[1].label).toBe('Models');
  });

  it('clears all log events', async () => {
    await addLog(mockEvent);
    await addLog(mockEvent);
    await clearLogs();
    const logs = await getAllLogs();
    expect(logs).toHaveLength(0);
  });

  it('returns empty array when no logs exist', async () => {
    const logs = await getAllLogs();
    expect(logs).toHaveLength(0);
  });

  it('notifies subscribers when logs change', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToLogChanges(listener);

    await addLog(mockEvent);
    await clearLogs();

    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('stops notifying after unsubscribe', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToLogChanges(listener);

    unsubscribe();
    await addLog(mockEvent);

    expect(listener).not.toHaveBeenCalled();
  });
});
