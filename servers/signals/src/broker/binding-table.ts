/**
 * Which listeners want each routing key. A key is bound on the broker while
 * at least one listener wants it, so two streams of the same signal share one
 * binding and the first to close does not cut off the other.
 */
export default class BindingTable<L> {
  private readonly listeners = new Map<string, Set<L>>();

  /** Add a listener of a key. True when the key had no listener before. */
  add(key: string, listener: L): boolean {
    const set = this.listeners.get(key) ?? new Set<L>();
    const isFirst = set.size === 0;
    set.add(listener);
    this.listeners.set(key, set);
    return isFirst;
  }

  /** Remove a listener of a key. True when the key has no listener left. */
  remove(key: string, listener: L): boolean {
    const set = this.listeners.get(key);
    if (!set?.delete(listener)) return false;
    if (set.size > 0) return false;
    this.listeners.delete(key);
    return true;
  }

  listenersOf(key: string): ReadonlySet<L> {
    return this.listeners.get(key) ?? new Set<L>();
  }

  allListeners(): Set<L> {
    return new Set([...this.listeners.values()].flatMap((set) => [...set]));
  }

  isEmpty(): boolean {
    return this.listeners.size === 0;
  }

  clear(): void {
    this.listeners.clear();
  }
}
