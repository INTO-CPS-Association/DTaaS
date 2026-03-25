 
import { LogEvent } from 'util/logger/logEvent';
import { DB_CONFIG } from 'database/types';

const STORE_NAME = 'logs';

let cachedDB: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (cachedDB) return Promise.resolve(cachedDB);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

    request.onerror = () => {
      dbPromise = null;
      reject(new Error('Failed to open IndexedDB for logs'));
    };

    request.onsuccess = (event) => {
      cachedDB = (event.target as IDBOpenDBRequest).result;
      cachedDB.onclose = () => {
        cachedDB = null;
        dbPromise = null;
      };
      dbPromise = null;
      resolve(cachedDB);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('executionHistory')) {
        const store = db.createObjectStore('executionHistory', {
          keyPath: DB_CONFIG.stores.executionHistory.keyPath,
        });
        for (const index of DB_CONFIG.stores.executionHistory.indexes) {
          store.createIndex(index.name, index.keyPath);
        }
      }

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const logsStore = db.createObjectStore(STORE_NAME, {
          keyPath: DB_CONFIG.stores.logs.keyPath,
          autoIncrement: DB_CONFIG.stores.logs.autoIncrement,
        });
        for (const index of DB_CONFIG.stores.logs.indexes) {
          logsStore.createIndex(index.name, index.keyPath);
        }
      }
    };
  });

  return dbPromise;
}

export async function addLog(event: LogEvent): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.add({ ...event });

    tx.oncomplete = () => resolve();
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

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new Error('Failed to clear log events'));
  });
}

export function resetDBConnection(): void {
  if (cachedDB) {
    cachedDB.close();
    cachedDB = null;
  }
  dbPromise = null;
}
