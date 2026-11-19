type Entry<V> = { value: V; expiresAt: number };

const DEFAULT_MAX_ENTRIES = 10_000;

/** A map whose entries expire, bounded so a flood of new keys cannot grow it. */
export default class TtlCache<V> {
  private readonly entries = new Map<string, Entry<V>>();

  // eslint-disable-next-line no-useless-constructor, no-empty-function
  constructor(private readonly maxEntries = DEFAULT_MAX_ENTRIES) {}

  get(key: string, now = Date.now()): V | undefined {
    const entry = this.entries.get(key);
    if (entry === undefined) return undefined;
    if (entry.expiresAt <= now) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: V, expiresAt: number, now = Date.now()): void {
    if (this.entries.size >= this.maxEntries) this.prune(now);
    this.entries.set(key, { value, expiresAt });
  }

  get size(): number {
    return this.entries.size;
  }

  private prune(now: number): void {
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(key);
    }
    // Still full after dropping expired entries: drop the oldest insertions.
    const excess = this.entries.size - this.maxEntries + 1;
    [...this.entries.keys()]
      .slice(0, Math.max(0, excess))
      .forEach((key) => this.entries.delete(key));
  }
}
