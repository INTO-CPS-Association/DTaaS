import { DB_CONFIG } from 'database/types';

type StoreConfig = (typeof DB_CONFIG.stores)[keyof typeof DB_CONFIG.stores];

function storeOptions(storeConfig: StoreConfig): IDBObjectStoreParameters {
  const options: IDBObjectStoreParameters = { keyPath: storeConfig.keyPath };
  if ('autoIncrement' in storeConfig) {
    options.autoIncrement = storeConfig.autoIncrement;
  }
  return options;
}

function createIndexes(store: IDBObjectStore, storeConfig: StoreConfig): void {
  for (const index of storeConfig.indexes) {
    store.createIndex(index.name, index.keyPath);
  }
}

function setupObjectStore(
  db: IDBDatabase,
  storeName: string,
  storeConfig: StoreConfig,
): void {
  if (db.objectStoreNames.contains(storeName)) return;
  const store = db.createObjectStore(storeName, storeOptions(storeConfig));
  createIndexes(store, storeConfig);
}

export function setupObjectStores(db: IDBDatabase): void {
  for (const [storeName, storeConfig] of Object.entries(DB_CONFIG.stores)) {
    setupObjectStore(db, storeName, storeConfig);
  }
}

let cachedDB: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

function clearDBCache(): void {
  cachedDB = null;
  dbPromise = null;
}

function handleVersionChange(): void {
  cachedDB?.close();
  clearDBCache();
}

function cacheDBConnection(db: IDBDatabase): IDBDatabase {
  cachedDB = db;
  cachedDB.onclose = clearDBCache;
  cachedDB.onversionchange = handleVersionChange;
  dbPromise = null;
  return cachedDB;
}

function rejectOpen(reject: (reason?: unknown) => void, message: string): void {
  dbPromise = null;
  reject(new Error(message));
}

interface OpenRequestState {
  settled: boolean;
}

function settleOpenFailure(
  state: OpenRequestState,
  reject: (reason?: unknown) => void,
  message: string,
): void {
  if (state.settled) return;
  state.settled = true;
  rejectOpen(reject, message);
}

function settleOpenSuccess(
  state: OpenRequestState,
  request: IDBOpenDBRequest,
  resolve: (db: IDBDatabase) => void,
): void {
  const db = request.result;
  if (state.settled) {
    db.close();
    return;
  }
  state.settled = true;
  resolve(cacheDBConnection(db));
}

function configureOpenRequest(
  request: IDBOpenDBRequest,
  state: OpenRequestState,
  resolve: (db: IDBDatabase) => void,
  reject: (reason?: unknown) => void,
): void {
  request.onerror = () =>
    settleOpenFailure(state, reject, 'Failed to open IndexedDB');
  request.onblocked = () =>
    settleOpenFailure(
      state,
      reject,
      'IndexedDB open blocked by another connection',
    );
  request.onsuccess = () => settleOpenSuccess(state, request, resolve);
  request.onupgradeneeded = () => setupObjectStores(request.result);
}

function createOpenDBPromise(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);
    configureOpenRequest(request, { settled: false }, resolve, reject);
  });
}

/**
 * Returns the single shared connection to the DTaaS IndexedDB database.
 * Every consumer (execution history, measurement history, logger) must go
 * through this function so that a version bump in one tab can close all
 * connections via onversionchange rather than hanging indefinitely waiting
 * on a connection that never releases the upgrade lock.
 */
export function openDB(): Promise<IDBDatabase> {
  if (cachedDB) return Promise.resolve(cachedDB);
  if (dbPromise) return dbPromise;

  dbPromise = createOpenDBPromise();

  return dbPromise;
}

export function resetDBConnection(): void {
  if (cachedDB) {
    cachedDB.close();
  }
  clearDBCache();
}
