import { DB_CONFIG } from 'database/types';

function setupObjectStores(db: IDBDatabase): void {
  for (const [storeName, storeConfig] of Object.entries(DB_CONFIG.stores)) {
    if (!db.objectStoreNames.contains(storeName)) {
      const store = db.createObjectStore(storeName, {
        keyPath: storeConfig.keyPath,
      });
      for (const index of storeConfig.indexes) {
        store.createIndex(index.name, index.keyPath);
      }
    }
  }
}

export interface CursorQuery {
  storeName: string;
  indexName: string;
  key: IDBValidKey;
}

export default abstract class BaseIndexedDBService {
  protected db: IDBDatabase | undefined;

  private readonly dbName: string;

  private readonly dbVersion: number;

  private initPromise: Promise<void> | undefined;

  constructor() {
    this.dbName = DB_CONFIG.name;
    this.dbVersion = DB_CONFIG.version;
  }

  public async init(): Promise<void> {
    if (this.db) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        this.initPromise = undefined;
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.initPromise = undefined;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        setupObjectStores((event.target as IDBOpenDBRequest).result);
      };
    });

    return this.initPromise;
  }

  protected async withStore<T>(
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest,
    errorMessage: string,
  ): Promise<T> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(
          new Error('Database not initialized - init() must be called first'),
        );
        return;
      }

      const transaction = this.db.transaction([storeName], mode);
      const store = transaction.objectStore(storeName);
      const request = operation(store);

      request.onerror = () => {
        reject(new Error(errorMessage));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  protected async withCursor(
    query: CursorQuery,
    cursorAction: (cursor: IDBCursorWithValue) => void,
    errorMessage: string,
  ): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(
          new Error('Database not initialized - init() must be called first'),
        );
        return;
      }

      const transaction = this.db.transaction([query.storeName], 'readwrite');
      const store = transaction.objectStore(query.storeName);
      const index = store.index(query.indexName);
      const request = index.openCursor(IDBKeyRange.only(query.key));

      request.onerror = () => {
        reject(new Error(errorMessage));
      };

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursorAction(cursor);
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }
}
