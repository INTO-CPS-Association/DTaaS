import 'fake-indexeddb/auto';
import { openDB, resetDBConnection } from 'database/dbConnection';

if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = <T>(obj: T): T =>
    JSON.parse(JSON.stringify(obj)) as T; // Simple deep clone for test purposes
}

describe('dbConnection', () => {
  afterEach(() => {
    resetDBConnection();
    jest.restoreAllMocks();
  });

  it('returns the same cached connection for consecutive opens', async () => {
    const first = await openDB();
    const second = await openDB();
    expect(second).toBe(first);
  });

  it('closes and clears the cached connection on a version change', async () => {
    const first = await openDB();
    const closeSpy = jest.spyOn(first, 'close');

    first.onversionchange?.(
      new Event('versionchange') as unknown as IDBVersionChangeEvent,
    );

    expect(closeSpy).toHaveBeenCalled();
    const second = await openDB();
    expect(second).not.toBe(first);
  });

  it('rejects when another connection blocks the open request', async () => {
    const fakeRequest = {} as IDBOpenDBRequest;
    const originalOpen = indexedDB.open.bind(indexedDB);
    indexedDB.open = jest.fn().mockReturnValue(fakeRequest);

    try {
      const opening = openDB();
      fakeRequest.onblocked?.(
        new Event('blocked') as unknown as IDBVersionChangeEvent,
      );
      await expect(opening).rejects.toThrow(
        'IndexedDB open blocked by another connection',
      );
    } finally {
      indexedDB.open = originalOpen;
    }
  });

  it('ignores late success after a blocked open rejects', async () => {
    const blockedDb = { close: jest.fn() } as unknown as IDBDatabase;
    const nextDb = {
      close: jest.fn(),
      onclose: null,
      onversionchange: null,
    } as unknown as IDBDatabase;
    const blockedRequest = { result: blockedDb } as IDBOpenDBRequest;
    const nextRequest = { result: nextDb } as IDBOpenDBRequest;
    const originalOpen = indexedDB.open.bind(indexedDB);
    indexedDB.open = jest
      .fn()
      .mockReturnValueOnce(blockedRequest)
      .mockReturnValueOnce(nextRequest);

    try {
      const blockedOpening = openDB();
      blockedRequest.onblocked?.(
        new Event('blocked') as unknown as IDBVersionChangeEvent,
      );
      await expect(blockedOpening).rejects.toThrow(
        'IndexedDB open blocked by another connection',
      );

      blockedRequest.onsuccess?.({
        target: blockedRequest,
      } as unknown as Event);
      expect(blockedDb.close).toHaveBeenCalled();

      const nextOpening = openDB();
      expect(indexedDB.open).toHaveBeenCalledTimes(2);
      nextRequest.onsuccess?.({ target: nextRequest } as unknown as Event);
      await expect(nextOpening).resolves.toBe(nextDb);
    } finally {
      indexedDB.open = originalOpen;
    }
  });
});
