import 'fake-indexeddb/auto';
import { ExecutionHistoryEntry } from 'model/backend/gitlab/types/executionHistory';
import indexedDBService from 'database/executionHistoryDB';
import { ExecutionStatus } from 'model/backend/interfaces/execution';

if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = <T>(obj: T): T =>
    JSON.parse(JSON.stringify(obj)) as T; // Simple deep clone for test purposes
}

async function clearDatabase() {
  try {
    const entries = await indexedDBService.getAll();
    await Promise.all(
      entries.map((entry) => indexedDBService.delete(entry.id)),
    );
  } catch (error) {
    throw new Error(`Failed to clear database: ${error}`);
  }
}

describe('IndexedDBService (Real Implementation)', () => {
  beforeEach(async () => {
    await indexedDBService.init();
    await clearDatabase();
  });

  it('should initialize the database', async () => {
    await expect(indexedDBService.init()).resolves.not.toThrow();
  });

  it('should add an execution history entry and retrieve it by ID', async () => {
    const entry: ExecutionHistoryEntry = {
      id: 'test-id-123',
      dtName: 'test-dt',
      pipelineId: 456,
      timestamp: Date.now(),
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    };

    const resultId = await indexedDBService.add(entry);
    expect(resultId).toBe(entry.id);

    const retrievedEntry = await indexedDBService.getById(entry.id);
    expect(retrievedEntry).not.toBeNull();
    expect(retrievedEntry).toEqual(entry);
  });

  it('should return null when getting a non-existent entry', async () => {
    const result = await indexedDBService.getById('non-existent-id');
    expect(result).toBeNull();
  });

  it('should update an existing execution history entry', async () => {
    const entry: ExecutionHistoryEntry = {
      id: 'test-id-456',
      dtName: 'test-dt',
      pipelineId: 456,
      timestamp: Date.now(),
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    };
    await indexedDBService.add(entry);

    const updatedEntry = {
      ...entry,
      status: ExecutionStatus.COMPLETED,
      jobLogs: [{ jobName: 'job1', log: 'log content' }],
    };
    await indexedDBService.update(updatedEntry);

    const retrievedEntry = await indexedDBService.getById(entry.id);
    expect(retrievedEntry).toEqual(updatedEntry);
    expect(retrievedEntry?.status).toBe(ExecutionStatus.COMPLETED);
    expect(retrievedEntry?.jobLogs).toHaveLength(1);
  });

  it('should retrieve entries by digital twin name', async () => {
    const dtName = 'test-dt-multi';
    const entries = [
      {
        id: 'multi-1',
        dtName,
        pipelineId: 101,
        timestamp: Date.now() - 1000,
        status: ExecutionStatus.COMPLETED,
        jobLogs: [],
      },
      {
        id: 'multi-2',
        dtName,
        pipelineId: 102,
        timestamp: Date.now(),
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      },
      {
        id: 'other-dt',
        dtName: 'other-dt',
        pipelineId: 103,
        timestamp: Date.now(),
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      },
    ];

    await Promise.all(entries.map((entry) => indexedDBService.add(entry)));

    // Retrieve by DT name
    const result = await indexedDBService.getByDTName(dtName);

    // Verify results
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result.every((entry) => entry.dtName === dtName)).toBe(true);
    expect(result.find((entry) => entry.id === 'multi-1')).toBeTruthy();
    expect(result.find((entry) => entry.id === 'multi-2')).toBeTruthy();
  });

  it('should return an empty array when no entries exist for a DT', async () => {
    const result = await indexedDBService.getByDTName('non-existent-dt');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it('should retrieve all execution history entries', async () => {
    const entries = [
      {
        id: 'all-1',
        dtName: 'dt-1',
        pipelineId: 201,
        timestamp: Date.now() - 1000,
        status: ExecutionStatus.COMPLETED,
        jobLogs: [],
      },
      {
        id: 'all-2',
        dtName: 'dt-2',
        pipelineId: 202,
        timestamp: Date.now(),
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      },
    ];

    await Promise.all(entries.map((entry) => indexedDBService.add(entry)));

    const result = await indexedDBService.getAll();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result.find((entry) => entry.id === 'all-1')).toBeTruthy();
    expect(result.find((entry) => entry.id === 'all-2')).toBeTruthy();
  });

  it('should delete an execution history entry by ID', async () => {
    // First, add an entry
    const entry: ExecutionHistoryEntry = {
      id: 'delete-id',
      dtName: 'test-dt',
      pipelineId: 456,
      timestamp: Date.now(),
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    };
    await indexedDBService.add(entry);

    // Verify it exists
    let retrievedEntry = await indexedDBService.getById(entry.id);
    expect(retrievedEntry).not.toBeNull();

    // Delete it
    await indexedDBService.delete(entry.id);

    retrievedEntry = await indexedDBService.getById(entry.id);
    expect(retrievedEntry).toBeNull();
  });

  it('should delete all execution history entries for a digital twin', async () => {
    // Add multiple entries for the same DT
    const dtName = 'delete-dt';
    const entries = [
      {
        id: 'delete-dt-1',
        dtName,
        pipelineId: 301,
        timestamp: Date.now() - 1000,
        status: ExecutionStatus.COMPLETED,
        jobLogs: [],
      },
      {
        id: 'delete-dt-2',
        dtName,
        pipelineId: 302,
        timestamp: Date.now(),
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      },
      {
        id: 'keep-dt',
        dtName: 'keep-dt',
        pipelineId: 303,
        timestamp: Date.now(),
        status: ExecutionStatus.RUNNING,
        jobLogs: [],
      },
    ];

    await Promise.all(entries.map((entry) => indexedDBService.add(entry)));

    await indexedDBService.deleteByDTName(dtName);

    const deletedEntries = await indexedDBService.getByDTName(dtName);
    expect(deletedEntries.length).toBe(0);

    // Verify other entries still exist
    const keptEntry = await indexedDBService.getById('keep-dt');
    expect(keptEntry).not.toBeNull();
  });

  it('should handle database initialization errors', async () => {
    const originalOpen = indexedDB.open;

    const mockRequest = {
      onerror: null as ((event: Event) => void) | null,
      onsuccess: null as ((event: Event) => void) | null,
      onupgradeneeded: null as ((event: IDBVersionChangeEvent) => void) | null,
    };

    const mockOpenImplementation = () => {
      setTimeout(() => {
        if (mockRequest.onerror) mockRequest.onerror(new Event('error'));
      }, 0);
      return mockRequest;
    };

    indexedDB.open = jest.fn().mockImplementation(mockOpenImplementation);

    const { default: IndexedDBService } = await import(
      'database/executionHistoryDB'
    );
    const newService = Object.create(Object.getPrototypeOf(IndexedDBService));
    newService.db = null;
    newService.dbName = 'test-db';
    newService.dbVersion = 1;

    await expect(newService.init()).rejects.toThrow('Failed to open IndexedDB');

    indexedDB.open = originalOpen;
  });

  it('should handle multiple init calls gracefully', async () => {
    await expect(indexedDBService.init()).resolves.not.toThrow();
    await expect(indexedDBService.init()).resolves.not.toThrow();
    await expect(indexedDBService.init()).resolves.not.toThrow();
  });

  it('should handle add operation errors', async () => {
    const entry: ExecutionHistoryEntry = {
      id: 'error-test',
      dtName: 'test-dt',
      pipelineId: 456,
      timestamp: Date.now(),
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    };

    await indexedDBService.add(entry);

    await expect(indexedDBService.add(entry)).rejects.toThrow(
      'Failed to add execution history',
    );
  });

  it('should handle empty results gracefully', async () => {
    const allEntries = await indexedDBService.getAll();
    expect(allEntries).toEqual([]);

    const dtEntries = await indexedDBService.getByDTName('non-existent');
    expect(dtEntries).toEqual([]);

    const singleEntry = await indexedDBService.getById('non-existent');
    expect(singleEntry).toBeNull();
  });

  it('should handle delete operations on non-existent entries', async () => {
    await expect(
      indexedDBService.delete('non-existent'),
    ).resolves.not.toThrow();

    await expect(
      indexedDBService.deleteByDTName('non-existent'),
    ).resolves.not.toThrow();
  });

  it('should handle concurrent add operations', async () => {
    const entries = Array.from({ length: 5 }, (_, i) => ({
      id: `concurrent-${i}`,
      dtName: 'concurrent-dt',
      pipelineId: 100 + i,
      timestamp: Date.now() + i,
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    }));

    await Promise.all(entries.map((entry) => indexedDBService.add(entry)));

    const result = await indexedDBService.getByDTName('concurrent-dt');
    expect(result.length).toBe(5);
  });

  it('should handle concurrent read/write operations', async () => {
    const entry: ExecutionHistoryEntry = {
      id: 'rw-test',
      dtName: 'rw-dt',
      pipelineId: 999,
      timestamp: Date.now(),
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    };

    const operations = [
      indexedDBService.add(entry),
      indexedDBService.getByDTName('rw-dt'),
      indexedDBService.getAll(),
    ];

    await Promise.all(operations);

    const result = await indexedDBService.getById('rw-test');
    expect(result).not.toBeNull();
  });

  it('should preserve data types and structure', async () => {
    const entry: ExecutionHistoryEntry = {
      id: 'integrity-test',
      dtName: 'integrity-dt',
      pipelineId: 12345,
      timestamp: 1640995200000, // Specific timestamp
      status: ExecutionStatus.COMPLETED,
      jobLogs: [
        { jobName: 'job1', log: 'log content 1' },
        { jobName: 'job2', log: 'log content 2' },
      ],
    };

    await indexedDBService.add(entry);
    const retrieved = await indexedDBService.getById('integrity-test');

    expect(retrieved).toEqual(entry);
    expect(typeof retrieved?.pipelineId).toBe('number');
    expect(typeof retrieved?.timestamp).toBe('number');
    expect(Array.isArray(retrieved?.jobLogs)).toBe(true);
    expect(retrieved?.jobLogs.length).toBe(2);
  });

  it('should handle large datasets', async () => {
    const createJobLog = (j: number, i: number) => ({
      jobName: `job-${j}`,
      log: `Log content for job ${j} in execution ${i}`,
    });

    const createDatasetEntry = (i: number) => ({
      id: `large-${i}`,
      dtName: `dt-${i % 5}`, // 5 different DTs
      pipelineId: 1000 + i,
      timestamp: Date.now() + i * 1000,
      status: i % 2 === 0 ? ExecutionStatus.COMPLETED : ExecutionStatus.RUNNING,
      jobLogs: Array.from({ length: 3 }, (__, j) => createJobLog(j, i)),
    });

    const largeDataset = Array.from({ length: 50 }, (_, i) =>
      createDatasetEntry(i),
    );

    await Promise.all(largeDataset.map((entry) => indexedDBService.add(entry)));

    const allEntries = await indexedDBService.getAll();
    expect(allEntries.length).toBe(50);

    const dt0Entries = await indexedDBService.getByDTName('dt-0');
    expect(dt0Entries.length).toBe(10); // Every 5th entry
  });

  it('should reject add operation when database is not initialized', async () => {
    const { default: IndexedDBService } = await import(
      'database/executionHistoryDB'
    );
    const uninitializedService = Object.create(
      Object.getPrototypeOf(IndexedDBService),
    );
    uninitializedService.db = undefined;
    uninitializedService.dbName = 'test-db';
    uninitializedService.dbVersion = 1;
    uninitializedService.initPromise = undefined;

    uninitializedService.init = jest.fn().mockResolvedValue(undefined);

    const entry: ExecutionHistoryEntry = {
      id: 'test-uninit',
      dtName: 'test-dt',
      pipelineId: 123,
      timestamp: Date.now(),
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    };

    await expect(uninitializedService.add(entry)).rejects.toThrow(
      'Database not initialized - init() must be called first',
    );
  });

  it('should call init before adding entry', async () => {
    const initSpy = jest.spyOn(indexedDBService, 'init');

    const entry: ExecutionHistoryEntry = {
      id: 'test-init-call',
      dtName: 'test-dt',
      pipelineId: 456,
      timestamp: Date.now(),
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    };

    await indexedDBService.add(entry);

    expect(initSpy).toHaveBeenCalled();

    initSpy.mockRestore();

    await indexedDBService.delete(entry.id);
  });

  it('should successfully return entry ID after add', async () => {
    const entry: ExecutionHistoryEntry = {
      id: 'test-return-id',
      dtName: 'test-dt',
      pipelineId: 789,
      timestamp: Date.now(),
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    };

    const resultId = await indexedDBService.add(entry);

    expect(resultId).toBe('test-return-id');
    expect(resultId).toBe(entry.id);

    const retrieved = await indexedDBService.getById(entry.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(resultId);

    await indexedDBService.delete(entry.id);
  });

  it('should reject update operation when database is not initialized', async () => {
    const { default: IndexedDBService } = await import(
      'database/executionHistoryDB'
    );
    const uninitializedService = Object.create(
      Object.getPrototypeOf(IndexedDBService),
    );
    uninitializedService.db = undefined;
    uninitializedService.dbName = 'test-db';
    uninitializedService.dbVersion = 1;
    uninitializedService.initPromise = undefined;
    uninitializedService.init = jest.fn().mockResolvedValue(undefined);

    const entry: ExecutionHistoryEntry = {
      id: 'test-update-uninit',
      dtName: 'test-dt',
      pipelineId: 123,
      timestamp: Date.now(),
      status: ExecutionStatus.RUNNING,
      jobLogs: [],
    };

    await expect(uninitializedService.update(entry)).rejects.toThrow(
      'Database not initialized',
    );
  });

  it('should reject getById operation when database is not initialized', async () => {
    const { default: IndexedDBService } = await import(
      'database/executionHistoryDB'
    );
    const uninitializedService = Object.create(
      Object.getPrototypeOf(IndexedDBService),
    );
    uninitializedService.db = undefined;
    uninitializedService.dbName = 'test-db';
    uninitializedService.dbVersion = 1;
    uninitializedService.initPromise = undefined;
    uninitializedService.init = jest.fn().mockResolvedValue(undefined);

    await expect(uninitializedService.getById('test-id')).rejects.toThrow(
      'Database not initialized',
    );
  });

  it('should reject getByDTName operation when database is not initialized', async () => {
    const { default: IndexedDBService } = await import(
      'database/executionHistoryDB'
    );
    const uninitializedService = Object.create(
      Object.getPrototypeOf(IndexedDBService),
    );
    uninitializedService.db = undefined;
    uninitializedService.dbName = 'test-db';
    uninitializedService.dbVersion = 1;
    uninitializedService.initPromise = undefined;
    uninitializedService.init = jest.fn().mockResolvedValue(undefined);

    await expect(uninitializedService.getByDTName('test-dt')).rejects.toThrow(
      'Database not initialized',
    );
  });

  it('should reject getAll operation when database is not initialized', async () => {
    const { default: IndexedDBService } = await import(
      'database/executionHistoryDB'
    );
    const uninitializedService = Object.create(
      Object.getPrototypeOf(IndexedDBService),
    );
    uninitializedService.db = undefined;
    uninitializedService.dbName = 'test-db';
    uninitializedService.dbVersion = 1;
    uninitializedService.initPromise = undefined;
    uninitializedService.init = jest.fn().mockResolvedValue(undefined);

    await expect(uninitializedService.getAll()).rejects.toThrow(
      'Database not initialized',
    );
  });

  it('should reject delete operation when database is not initialized', async () => {
    const { default: IndexedDBService } = await import(
      'database/executionHistoryDB'
    );
    const uninitializedService = Object.create(
      Object.getPrototypeOf(IndexedDBService),
    );
    uninitializedService.db = undefined;
    uninitializedService.dbName = 'test-db';
    uninitializedService.dbVersion = 1;
    uninitializedService.initPromise = undefined;
    uninitializedService.init = jest.fn().mockResolvedValue(undefined);

    await expect(uninitializedService.delete('test-id')).rejects.toThrow(
      'Database not initialized',
    );
  });

  it('should reject deleteByDTName operation when database is not initialized', async () => {
    const { default: IndexedDBService } = await import(
      'database/executionHistoryDB'
    );
    const uninitializedService = Object.create(
      Object.getPrototypeOf(IndexedDBService),
    );
    uninitializedService.db = undefined;
    uninitializedService.dbName = 'test-db';
    uninitializedService.dbVersion = 1;
    uninitializedService.initPromise = undefined;
    uninitializedService.init = jest.fn().mockResolvedValue(undefined);

    await expect(
      uninitializedService.deleteByDTName('test-dt'),
    ).rejects.toThrow('Database not initialized');
  });
});
