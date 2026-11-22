import type {
  DTExecutionResult,
  IExecutionHistory,
} from '@into-cps-association/dt-automation';

// Stores and returns copies, so that neither the package nor the Redux store
// shares an object with it.
export default class InMemoryExecutionHistory implements IExecutionHistory {
  private readonly entries = new Map<string, DTExecutionResult>();

  async init(): Promise<void> {
    // A map needs no setup.
  }

  add(entry: DTExecutionResult): Promise<string> {
    this.entries.set(entry.id, structuredClone(entry));
    return Promise.resolve(entry.id);
  }

  update(entry: DTExecutionResult): Promise<void> {
    this.entries.set(entry.id, structuredClone(entry));
    return Promise.resolve();
  }

  getById(id: string): Promise<DTExecutionResult | null> {
    const entry = this.entries.get(id);
    return Promise.resolve(entry === undefined ? null : structuredClone(entry));
  }

  async getByDTName(dtName: string): Promise<DTExecutionResult[]> {
    return (await this.getAll()).filter((entry) => entry.dtName === dtName);
  }

  getAll(): Promise<DTExecutionResult[]> {
    return Promise.resolve(
      [...this.entries.values()].map((entry) => structuredClone(entry)),
    );
  }

  delete(id: string): Promise<void> {
    this.entries.delete(id);
    return Promise.resolve();
  }

  deleteByDTName(dtName: string): Promise<void> {
    for (const [id, entry] of this.entries) {
      if (entry.dtName === dtName) this.entries.delete(id);
    }
    return Promise.resolve();
  }
}
