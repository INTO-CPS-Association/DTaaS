import { DTExecutionResult } from 'model/backend/gitlab/types/executionHistory';
import { IExecutionHistory } from 'model/backend/interfaces/execution';
import BaseIndexedDBService, {
  type CursorQuery,
} from 'database/BaseIndexedDBService';

const STORE = 'executionHistory';

class IndexedDBService
  extends BaseIndexedDBService
  implements IExecutionHistory
{
  public async add(entry: DTExecutionResult): Promise<string> {
    await this.withStore(
      STORE,
      'readwrite',
      (store) => store.add(entry),
      'Failed to add execution history',
    );
    return entry.id;
  }

  public async update(entry: DTExecutionResult): Promise<void> {
    await this.withStore<void>(
      STORE,
      'readwrite',
      (store) => store.put(entry),
      'Failed to update execution history',
    );
  }

  public async getById(id: string): Promise<DTExecutionResult | null> {
    const result = await this.withStore<DTExecutionResult | undefined>(
      STORE,
      'readonly',
      (store) => store.get(id),
      'Failed to get execution history',
    );
    return result || null;
  }

  public async getByDTName(dtName: string): Promise<DTExecutionResult[]> {
    return this.withStore<DTExecutionResult[]>(
      STORE,
      'readonly',
      (store) => store.index('dtName').getAll(dtName),
      'Failed to get execution history by DT name',
    );
  }

  public async getAll(): Promise<DTExecutionResult[]> {
    return this.withStore<DTExecutionResult[]>(
      STORE,
      'readonly',
      (store) => store.getAll(),
      'Failed to get all execution history',
    );
  }

  public async delete(id: string): Promise<void> {
    await this.withStore<void>(
      STORE,
      'readwrite',
      (store) => store.delete(id),
      'Failed to delete execution history',
    );
  }

  public async deleteByDTName(dtName: string): Promise<void> {
    const query: CursorQuery = {
      storeName: STORE,
      indexName: 'dtName',
      key: dtName,
    };
    return this.withCursor(
      query,
      (cursor) => cursor.delete(),
      'Failed to delete execution history by DT name',
    );
  }
}

const indexedDBService = new IndexedDBService();

export default indexedDBService;
