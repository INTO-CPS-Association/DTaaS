type Stored<T> = { request: string; reply: T };

// How to answer a request that is not a repeat: compute a reply, the
// reply for a key of another request, and which replies to keep
export type Handlers<T> = {
  compute: () => T;
  mismatch: () => T;
  keep: (reply: T) => boolean;
};

// The replies to the latest requests that carried a request key, so
// that a repeated request gets the same reply. The oldest key goes
// first once the store is full. An empty key, or none, marks no
// request.
export default class RecentReplies<T> {
  private readonly replies = new Map<string, Stored<T>>();

  constructor(private readonly limit = 256) {}

  get(key: string | undefined): Stored<T> | undefined {
    return key ? this.replies.get(key) : undefined;
  }

  // The stored reply to a repeated request, the mismatch reply to a key
  // of another request, or else a new reply, kept if handlers.keep says
  resolve(key: string | undefined, request: string, handlers: Handlers<T>): T {
    const earlier = this.get(key);
    if (earlier === undefined) {
      return this.store(key, request, handlers);
    }
    return earlier.request === request ? earlier.reply : handlers.mismatch();
  }

  private store(
    key: string | undefined,
    request: string,
    { compute, keep }: Handlers<T>,
  ): T {
    const reply = compute();
    if (keep(reply)) {
      this.add(key, request, reply);
    }
    return reply;
  }

  add(key: string | undefined, request: string, reply: T): void {
    if (!key) {
      return;
    }
    this.replies.set(key, { request, reply });
    if (this.replies.size > this.limit) {
      const [oldest] = this.replies.keys();
      this.replies.delete(oldest);
    }
  }
}
