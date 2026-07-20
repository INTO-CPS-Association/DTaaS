import { openDB } from 'database/dbConnection';

export interface CursorQuery {
  storeName: string;
  indexName: string;
  key: IDBValidKey;
}

function openCursorRequest(
  store: IDBObjectStore,
  query: CursorQuery,
): IDBRequest<IDBCursorWithValue | null> {
  return store.index(query.indexName).openCursor(IDBKeyRange.only(query.key));
}

function handleCursorResult(
  request: IDBRequest<IDBCursorWithValue | null>,
  cursorAction: (cursor: IDBCursorWithValue) => void,
  resolve: () => void,
): void {
  const cursor = request.result;
  if (!cursor) {
    resolve();
    return;
  }
  cursorAction(cursor);
  cursor.continue();
}

interface CursorHandlerOptions {
  request: IDBRequest<IDBCursorWithValue | null>;
  cursorAction: (cursor: IDBCursorWithValue) => void;
  resolve: () => void;
  reject: (reason?: unknown) => void;
  errorMessage: string;
}

function attachCursorHandlers(options: CursorHandlerOptions): void {
  const { request, cursorAction, resolve, reject, errorMessage } = options;
  request.onerror = () => reject(new Error(errorMessage));
  request.onsuccess = () => handleCursorResult(request, cursorAction, resolve);
}

export default abstract class BaseIndexedDBService {
  protected db: IDBDatabase | undefined;

  public async init(): Promise<void> {
    this.db = await openDB();
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
      const request = openCursorRequest(store, query);
      attachCursorHandlers({
        request,
        cursorAction,
        resolve,
        reject,
        errorMessage,
      });
    });
  }
}
