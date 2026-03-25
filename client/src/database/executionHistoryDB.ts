import { DTExecutionResult } from 'model/backend/gitlab/types/executionHistory';
import { DB_CONFIG } from 'database/types';
import { IExecutionHistory } from 'model/backend/interfaces/execution';

/**
 * For interacting with IndexedDB
 */
class IndexedDBService implements IExecutionHistory {
  private db: IDBDatabase | undefined;

  private readonly dbName: string;

  private readonly dbVersion: number;

  private initPromise: Promise<void> | undefined;

  constructor() {
    this.dbName = DB_CONFIG.name;
    this.dbVersion = DB_CONFIG.version;
  }

  /**
   * Initialize the database
   * @returns Promise that resolves when the database is initialized
   */
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
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('executionHistory')) {
          const store = db.createObjectStore('executionHistory', {
            keyPath: DB_CONFIG.stores.executionHistory.keyPath,
          });

          for (const index of DB_CONFIG.stores.executionHistory.indexes) {
            store.createIndex(index.name, index.keyPath);
          }
        }

        if (!db.objectStoreNames.contains('logs')) {
          const logsStore = db.createObjectStore('logs', {
            keyPath: DB_CONFIG.stores.logs.keyPath,
            autoIncrement: DB_CONFIG.stores.logs.autoIncrement,
          });

          for (const index of DB_CONFIG.stores.logs.indexes) {
            logsStore.createIndex(index.name, index.keyPath);
          }
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Add a new execution history entry
   * @param entry The execution history entry to add
   * @returns Promise that resolves with the ID of the added entry
   */
  public async add(entry: DTExecutionResult): Promise<string> {
    await this.init();

    return new Promise((resolve, reject) => {
      // After init(), db is guaranteed to be defined
      if (!this.db) {
        reject(
          new Error('Database not initialized - init() must be called first'),
        );
        return;
      }

      const transaction = this.db.transaction(
        ['executionHistory'],
        'readwrite',
      );
      const store = transaction.objectStore('executionHistory');
      const request = store.add(entry);

      request.onerror = () => {
        reject(new Error('Failed to add execution history'));
      };

      request.onsuccess = () => {
        resolve(entry.id);
      };
    });
  }

  /**
   * Update an existing execution history entry
   * @param entry The execution history entry to update
   * @returns Promise that resolves when the entry is updated
   */
  public async update(entry: DTExecutionResult): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(
        ['executionHistory'],
        'readwrite',
      );
      const store = transaction.objectStore('executionHistory');
      const request = store.put(entry);

      request.onerror = () => {
        reject(new Error('Failed to update execution history'));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Get an execution history entry by ID
   * @param id The ID of the execution history entry
   * @returns Promise that resolves with the execution history entry
   */
  public async getById(id: string): Promise<DTExecutionResult | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['executionHistory'], 'readonly');
      const store = transaction.objectStore('executionHistory');
      const request = store.get(id);

      request.onerror = () => {
        reject(new Error('Failed to get execution history'));
      };

      request.onsuccess = () => {
        resolve(request.result || null);
      };
    });
  }

  /**
   * Get all execution history entries for a Digital Twin
   * @param dtName The name of the Digital Twin
   * @returns Promise that resolves with an array of execution history entries
   */
  public async getByDTName(dtName: string): Promise<DTExecutionResult[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['executionHistory'], 'readonly');
      const store = transaction.objectStore('executionHistory');
      const index = store.index('dtName');
      const request = index.getAll(dtName);

      request.onerror = () => {
        reject(new Error('Failed to get execution history by DT name'));
      };

      request.onsuccess = () => {
        resolve(request.result || []);
      };
    });
  }

  /**
   * Get all execution history entries
   * @returns Promise that resolves with an array of all execution history entries
   */
  public async getAll(): Promise<DTExecutionResult[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['executionHistory'], 'readonly');
      const store = transaction.objectStore('executionHistory');
      const request = store.getAll();

      request.onerror = () => {
        reject(new Error('Failed to get all execution history'));
      };

      request.onsuccess = () => {
        resolve(request.result || []);
      };
    });
  }

  /**
   * Delete an execution history entry
   * @param id The ID of the execution history entry to delete
   * @returns Promise that resolves when the entry is deleted
   */
  public async delete(id: string): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(
        ['executionHistory'],
        'readwrite',
      );
      const store = transaction.objectStore('executionHistory');
      const request = store.delete(id);

      request.onerror = () => {
        reject(new Error('Failed to delete execution history'));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Delete all execution history entries for a Digital Twin
   * @param dtName The name of the Digital Twin
   * @returns Promise that resolves when all entries are deleted
   */
  public async deleteByDTName(dtName: string): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(
        ['executionHistory'],
        'readwrite',
      );
      const store = transaction.objectStore('executionHistory');
      const index = store.index('dtName');
      const request = index.openCursor(IDBKeyRange.only(dtName));

      request.onerror = () => {
        reject(new Error('Failed to delete execution history by DT name'));
      };

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }
}

const indexedDBService = new IndexedDBService();

export default indexedDBService;
