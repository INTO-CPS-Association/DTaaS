import 'fake-indexeddb/auto';
import {
  addLog,
  getAllLogs,
  clearLogs,
  subscribeToLogChanges,
  resetDBConnection,
  MAX_LOG_BYTES,
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

  it('prunes the oldest entries once the store exceeds the byte budget', async () => {
    const paddingSize = 4 * 1024 * 1024;
    const padding = 'x'.repeat(paddingSize);
    const entryCount = Math.ceil(MAX_LOG_BYTES / paddingSize) + 2;

    for (let i = 0; i < entryCount; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await addLog({
        ...mockEvent,
        timestamp: new Date(2026, 0, 1, 0, 0, i).toISOString(),
        label: `entry-${i}`,
        context: { padding },
      });
    }

    const logs = await getAllLogs();
    const totalBytes = logs.reduce(
      (sum, entry) => sum + new Blob([JSON.stringify(entry)]).size,
      0,
    );
    expect(totalBytes).toBeLessThanOrEqual(MAX_LOG_BYTES);
    const labels = logs.map((entry) => entry.label);
    expect(labels).not.toContain('entry-0');
    expect(labels).toContain(`entry-${entryCount - 1}`);
  }, 30000);

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

  describe('cross-tab change notifications', () => {
    class FakeBroadcastChannel {
      static instances: FakeBroadcastChannel[] = [];

      onmessage: ((event: MessageEvent) => void) | null = null;

      postMessage = jest.fn();

      close = jest.fn();

      constructor(readonly name: string) {
        FakeBroadcastChannel.instances.push(this);
      }
    }

    beforeEach(() => {
      FakeBroadcastChannel.instances = [];
      (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel =
        FakeBroadcastChannel;
    });

    afterEach(() => {
      resetDBConnection();
      delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
    });

    it('broadcasts log changes to other tabs', async () => {
      await addLog(mockEvent);

      expect(FakeBroadcastChannel.instances).toHaveLength(1);
      const channel = FakeBroadcastChannel.instances[0];
      expect(channel.name).toBe('dtaas-workflow-logs');
      expect(channel.postMessage).toHaveBeenCalledWith('dtaas:logs-changed');
    });

    it('notifies local subscribers when another tab reports a change', () => {
      const listener = jest.fn();
      const unsubscribe = subscribeToLogChanges(listener);

      const channel = FakeBroadcastChannel.instances[0];
      expect(channel).toBeDefined();
      channel.onmessage?.({} as MessageEvent);

      expect(listener).toHaveBeenCalledTimes(1);
      unsubscribe();
    });

    it('closes the channel when the connection is reset', async () => {
      await addLog(mockEvent);
      const channel = FakeBroadcastChannel.instances[0];

      resetDBConnection();

      expect(channel.close).toHaveBeenCalled();
    });

    it('rescans the store size after another tab reports a change', async () => {
      const getAllSpy = jest.spyOn(IDBObjectStore.prototype, 'getAll');

      // The running byte total is already cached, so writes reuse it.
      await addLog(mockEvent);
      const scansBefore = getAllSpy.mock.calls.length;
      await addLog(mockEvent);
      expect(getAllSpy.mock.calls).toHaveLength(scansBefore);

      // A change in another tab must invalidate the cached total; otherwise
      // a stale over-budget estimate would prune every subsequent write.
      const channel = FakeBroadcastChannel.instances[0];
      channel.onmessage?.({} as MessageEvent);
      await addLog(mockEvent);

      expect(getAllSpy.mock.calls).toHaveLength(scansBefore + 1);
      expect(await getAllLogs()).toHaveLength(3);
      getAllSpy.mockRestore();
    });
  });
});
