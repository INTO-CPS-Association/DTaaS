/** Thrown when extension code opens a WebSocket or EventSource. */
export class SocketBlockedError extends Error {
  constructor(readonly url: string) {
    super(`Extension opened a socket to ${url}`);
    this.name = 'SocketBlockedError';
  }
}

export interface SocketGuard {
  /** URLs of every blocked connection attempt while this guard was active. */
  readonly attempts: string[];
  restore(): void;
}

const GUARDED = ['WebSocket', 'EventSource'] as const;

type GuardedGlobals = Record<(typeof GUARDED)[number], unknown>;

const target = globalThis as unknown as GuardedGlobals;

/** Attempt lists of the guards currently installed; shared by overlapping checks. */
const active = new Set<string[]>();
let originals: (readonly [string, PropertyDescriptor | undefined])[] = [];

function Blocked(url: string | URL) {
  active.forEach((attempts) => attempts.push(String(url)));
  throw new SocketBlockedError(String(url));
}

const block = () => {
  originals = GUARDED.map(
    (name) => [name, Object.getOwnPropertyDescriptor(target, name)] as const,
  );
  GUARDED.forEach((name) => {
    Object.defineProperty(target, name, {
      value: Blocked,
      configurable: true,
      writable: true,
    });
  });
};

const unblock = () =>
  originals.forEach(([name, descriptor]) => {
    if (descriptor) Object.defineProperty(target, name, descriptor);
    else delete target[name as keyof GuardedGlobals];
  });

/**
 * Replaces `WebSocket` and `EventSource` with constructors that record the
 * URL and throw, so a kit that bypasses `HostServices.signals` is caught.
 * Overlapping guards share one installation; the last restore removes it.
 */
const installSocketGuard = (): SocketGuard => {
  const attempts: string[] = [];
  if (active.size === 0) block();
  active.add(attempts);
  const restore = () => {
    if (active.delete(attempts) && active.size === 0) unblock();
  };
  return { attempts, restore };
};

export default installSocketGuard;
