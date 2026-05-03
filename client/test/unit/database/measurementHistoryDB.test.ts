import 'fake-indexeddb/auto';
import measurementDBService from 'database/measurementHistoryDB';
import { createMockTask } from 'test/unit/model/backend/gitlab/measure/measurement.testUtil';
import { clearDatabase } from 'test/unit/model/backend/gitlab/measure/measurement.envSetup';

describe('MeasurementDBService (Real Implementation)', () => {
  beforeEach(async () => {
    await measurementDBService.init();
    await clearDatabase(measurementDBService);
  });

  it('should initialize the database', async () => {
    await expect(measurementDBService.init()).resolves.not.toThrow();
  });

  it('should add a measurement record and retrieve it', async () => {
    const task = createMockTask({ 'Task Name': 'Add Test Task' });

    const resultId = await measurementDBService.add(task);
    expect(resultId).toContain('Add Test Task');

    const allRecords = await measurementDBService.getAll();
    expect(allRecords.length).toBe(1);
    expect(allRecords[0].taskName).toBe('Add Test Task');
  });

  it('should retrieve measurements by task name', async () => {
    const taskName = 'Specific Task';
    const task1 = createMockTask({ 'Task Name': taskName });
    const task2 = createMockTask({ 'Task Name': taskName });
    const task3 = createMockTask({ 'Task Name': 'Other Task' });

    await measurementDBService.add(task1);
    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    }); // Ensure unique timestamps
    await measurementDBService.add(task2);
    await measurementDBService.add(task3);

    const results = await measurementDBService.getByTaskName(taskName);
    expect(results.length).toBe(2);
    expect(results.every((r) => r.taskName === taskName)).toBe(true);
  });

  it('should return empty array for non-existent task name', async () => {
    const results = await measurementDBService.getByTaskName('Non-existent');
    expect(results).toEqual([]);
  });

  it('should retrieve all measurement records', async () => {
    const task1 = createMockTask({ 'Task Name': 'Task 1' });
    const task2 = createMockTask({ 'Task Name': 'Task 2' });
    const task3 = createMockTask({ 'Task Name': 'Task 3' });

    await measurementDBService.add(task1);
    await measurementDBService.add(task2);
    await measurementDBService.add(task3);

    const allRecords = await measurementDBService.getAll();
    expect(allRecords.length).toBe(3);
  });

  it('should delete a specific measurement record', async () => {
    const task = createMockTask({ 'Task Name': 'Delete Test' });

    const id = await measurementDBService.add(task);

    let allRecords = await measurementDBService.getAll();
    expect(allRecords.length).toBe(1);

    await measurementDBService.delete(id);

    allRecords = await measurementDBService.getAll();
    expect(allRecords.length).toBe(0);
  });

  it('should purge all measurement records', async () => {
    const task1 = createMockTask({ 'Task Name': 'Purge Task 1' });
    const task2 = createMockTask({ 'Task Name': 'Purge Task 2' });
    const task3 = createMockTask({ 'Task Name': 'Purge Task 3' });

    await measurementDBService.add(task1);
    await measurementDBService.add(task2);
    await measurementDBService.add(task3);

    let allRecords = await measurementDBService.getAll();
    expect(allRecords.length).toBe(3);

    await measurementDBService.purge();

    allRecords = await measurementDBService.getAll();
    expect(allRecords.length).toBe(0);
  });

  it('should store complete task data in measurement record', async () => {
    const task = createMockTask({ 'Task Name': 'Complete Data Task' });
    await measurementDBService.add(task);

    const [record] = await measurementDBService.getAll();
    expect(record.task['Task Name']).toBe('Complete Data Task');
    expect(record.task.Description).toBe(task.Description);
    expect(record.task.Trials).toEqual(task.Trials);
  });

  it('should handle multiple init calls gracefully', async () => {
    await expect(measurementDBService.init()).resolves.not.toThrow();
    await expect(measurementDBService.init()).resolves.not.toThrow();
    await expect(measurementDBService.init()).resolves.not.toThrow();
  });

  it('should handle delete on non-existent ID', async () => {
    await expect(
      measurementDBService.delete('non-existent-id'),
    ).resolves.not.toThrow();
  });

  it('should handle concurrent add operations', async () => {
    const tasks = Array.from({ length: 5 }, (_, i) =>
      createMockTask({ 'Task Name': `Concurrent Task ${i}` }),
    );

    await Promise.all(tasks.map((task) => measurementDBService.add(task)));

    const allRecords = await measurementDBService.getAll();
    expect(allRecords.length).toBe(5);
  });

  it('should generate unique IDs for same task added multiple times', async () => {
    const task = createMockTask({ 'Task Name': 'Same Task' });

    const id1 = await measurementDBService.add(task);
    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });
    const id2 = await measurementDBService.add(task);

    expect(id1).not.toBe(id2);

    const allRecords = await measurementDBService.getAll();
    expect(allRecords.length).toBe(2);
  });

  it('should store timestamp with measurement record', async () => {
    const beforeAdd = Date.now();
    const task = createMockTask({ 'Task Name': 'Timestamp Task' });

    await measurementDBService.add(task);
    const afterAdd = Date.now();

    const allRecords = await measurementDBService.getAll();
    expect(allRecords[0].timestamp).toBeGreaterThanOrEqual(beforeAdd);
    expect(allRecords[0].timestamp).toBeLessThanOrEqual(afterAdd);
  });

  it.each([
    ['add', (svc: typeof measurementDBService) => svc.add(createMockTask())],
    ['getAll', (svc: typeof measurementDBService) => svc.getAll()],
    [
      'getByTaskName',
      (svc: typeof measurementDBService) => svc.getByTaskName('test'),
    ],
    ['purge', (svc: typeof measurementDBService) => svc.purge()],
    ['delete', (svc: typeof measurementDBService) => svc.delete('test-id')],
  ])(
    'should reject %s when database is not initialized',
    async (_name, operation) => {
      const uninitializedService = Object.create(
        Object.getPrototypeOf(measurementDBService),
      );
      uninitializedService.db = undefined;
      uninitializedService.dbName = 'test-db';
      uninitializedService.dbVersion = 1;
      uninitializedService.initPromise = undefined;
      uninitializedService.init = jest.fn().mockResolvedValue(undefined);

      await expect(operation(uninitializedService)).rejects.toThrow(
        'Database not initialized',
      );
    },
  );

  it('should return existing init promise when called concurrently', async () => {
    const service = Object.create(Object.getPrototypeOf(measurementDBService));
    service.db = undefined;
    service.dbName = 'concurrent-test-db';
    service.dbVersion = 1;
    service.initPromise = undefined;

    const originalOpen = indexedDB.open;
    let openCallCount = 0;
    indexedDB.open = jest.fn(() => {
      openCallCount += 1;
      return originalOpen.call(indexedDB, service.dbName, service.dbVersion);
    });

    const promise1 = service.init();
    const promise2 = service.init();

    await Promise.all([promise1, promise2]);
    expect(openCallCount).toBe(1);

    indexedDB.open = originalOpen;
  });
});
