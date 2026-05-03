import { TimedTask } from 'model/backend/gitlab/measure/measurement.execution';
import BaseIndexedDBService from 'database/BaseIndexedDBService';
import type { MeasurementRecord } from 'model/backend/gitlab/measure/measurement.types';

export type { MeasurementRecord } from 'model/backend/gitlab/measure/measurement.types';

const STORE = 'measurementHistory';

class MeasurementDBService extends BaseIndexedDBService {
  public async add(task: TimedTask): Promise<string> {
    const id = `${task['Task Name']}-${Date.now()}`;
    const record: MeasurementRecord = {
      id,
      taskName: task['Task Name'],
      timestamp: Date.now(),
      task,
    };

    await this.withStore(
      STORE,
      'readwrite',
      (store) => store.add(record),
      'Failed to add measurement record',
    );
    return id;
  }

  public async getAll(): Promise<MeasurementRecord[]> {
    return this.withStore<MeasurementRecord[]>(
      STORE,
      'readonly',
      (store) => store.getAll(),
      'Failed to get all measurement records',
    );
  }

  public async getByTaskName(taskName: string): Promise<MeasurementRecord[]> {
    return this.withStore<MeasurementRecord[]>(
      STORE,
      'readonly',
      (store) => store.index('taskName').getAll(taskName),
      'Failed to get measurement records by task name',
    );
  }

  public async purge(): Promise<void> {
    await this.withStore<void>(
      STORE,
      'readwrite',
      (store) => store.clear(),
      'Failed to purge measurement records',
    );
  }

  public async delete(id: string): Promise<void> {
    await this.withStore<void>(
      STORE,
      'readwrite',
      (store) => store.delete(id),
      'Failed to delete measurement record',
    );
  }
}

const measurementDBService = new MeasurementDBService();

export default measurementDBService;
