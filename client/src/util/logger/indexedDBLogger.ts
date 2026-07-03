import { LogEvent } from 'util/logger/logEvent';
import { DB_CONFIG } from 'database/types';
import { setupObjectStores } from 'database/BaseIndexedDBService';

const STORE_NAME = 'logs';
const LOGS_CHANGED_EVENT = 'dtaas:logs-changed';
const LOGS_CHANGED_CHANNEL = 'dtaas-workflow-logs';

let cachedDB: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;
let changeChannel: BroadcastChannel | null = null;

function emitLocalLogChange(): void {
  window.dispatchEvent(new Event(LOGS_CHANGED_EVENT));
}

function getChangeChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (changeChannel) return changeChannel;

  changeChannel = new BroadcastChannel(LOGS_CHANGED_CHANNEL);
  changeChannel.onmessage = emitLocalLogChange;
  return changeChannel;
}

function notifyLogChange(): void {
  emitLocalLogChange();
  getChangeChannel()?.postMessage(LOGS_CHANGED_EVENT);
}

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

function createOpenDBPromise(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

    request.onerror = () => {
      rejectOpen(reject, 'Failed to open IndexedDB for logs');
    };

    request.onblocked = () => {
      rejectOpen(reject, 'IndexedDB open blocked by another tab');
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(cacheDBConnection(db));
    };

    request.onupgradeneeded = (event) => {
      setupObjectStores((event.target as IDBOpenDBRequest).result);
    };
  });
}

function openDB(): Promise<IDBDatabase> {
  if (cachedDB) return Promise.resolve(cachedDB);
  if (dbPromise) return dbPromise;

  dbPromise = createOpenDBPromise();

  return dbPromise;
}

export async function addLog(event: LogEvent): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.add({ ...event });

    tx.oncomplete = () => {
      notifyLogChange();
      resolve();
    };
    tx.onerror = () => reject(new Error('Failed to add log event'));
  });
}

export async function getAllLogs(): Promise<LogEvent[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    tx.oncomplete = () => resolve(request.result || []);
    tx.onerror = () => reject(new Error('Failed to get log events'));
  });
}

export async function clearLogs(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();

    tx.oncomplete = () => {
      notifyLogChange();
      resolve();
    };
    tx.onerror = () => reject(new Error('Failed to clear log events'));
  });
}

export function subscribeToLogChanges(listener: () => void): () => void {
  const handleLogChange = () => listener();
  window.addEventListener(LOGS_CHANGED_EVENT, handleLogChange);
  getChangeChannel();
  return () => window.removeEventListener(LOGS_CHANGED_EVENT, handleLogChange);
}

export function resetDBConnection(): void {
  if (cachedDB) {
    cachedDB.close();
  }
  changeChannel?.close();
  changeChannel = null;
  clearDBCache();
}
