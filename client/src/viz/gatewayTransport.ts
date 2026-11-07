/**
 * Live signals from the DTaaS signals gateway, as server-sent events.
 *
 * The gateway subscribes to the broker on the server and forwards what the
 * signed-in user may read, so the browser needs no broker login. One stream
 * carries every path in use. When the set of paths changes, the stream is
 * opened again with the new set, a moment later, so a page that subscribes to
 * twenty sensors as it renders opens one stream and not twenty.
 *
 * The gateway reports its own connection to the broker in `state` events.
 * A stream that fails or ends reads `down` until the next one opens, five
 * seconds later unless the gateway asked for another wait with `retry:`. A
 * stream whose token the gateway refused is not opened again with that token.
 */

import type {
  Channel,
  ConnectionState,
  SignalSink,
} from '@into-cps-association/dtaas-sdk';
import { openSse, RefusedError, type SseEvent } from 'viz/sseStream';
import eventHandler from 'viz/gatewayEvents';
import {
  authorization,
  endpoint,
  FORBIDDEN,
  UNAUTHORISED,
  type GatewaySettings,
} from 'viz/gateway';
import type { LiveTransport } from 'viz/transport';

/** How long a change of paths waits for the next one, in milliseconds. */
export const REOPEN_DELAY_MS = 100;
/** How long a failed or ended stream waits before the next one. */
export const RECONNECT_DELAY_MS = 5000;

/** The sinks of each path, and whether a change altered the set of paths. */
function pathBook() {
  const sinks = new Map<string, Set<SignalSink>>();
  // Every path gets the sink, so the loop must not stop at the first new one.
  const add = (paths: readonly string[], sink: SignalSink) => {
    let changed = false;
    paths.forEach((path) => {
      const set = sinks.get(path) ?? new Set<SignalSink>();
      sinks.set(path, set.add(sink));
      if (set.size === 1) changed = true;
    });
    return changed;
  };
  const remove = (paths: readonly string[], sink: SignalSink) =>
    paths.filter((path) => {
      const set = sinks.get(path);
      if (!set?.delete(sink) || set.size > 0) return false;
      return sinks.delete(path);
    });
  return {
    add,
    remove,
    paths: () => [...sinks.keys()],
    sinksOf: (path: string) => sinks.get(path) ?? new Set<SignalSink>(),
  };
}

type PathBook = ReturnType<typeof pathBook>;

function stateCell() {
  let current: ConnectionState = 'connecting';
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set(next: ConnectionState) {
      if (next === current) return;
      current = next;
      listeners.forEach((listener) => listener());
    },
    on(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

type StateCell = ReturnType<typeof stateCell>;

interface Stream {
  schedule(delayMs: number): void;
  stop(): void;
}

/**
 * How long to wait after a failure, or undefined when nothing should be asked
 * again: the token was refused, or none of the paths may be read. The gateway
 * answers 403 only when it refuses every path, so those paths are refused
 * here as a `refused` event would, until the page asks for them again.
 */
function retryAfter(
  settings: GatewaySettings,
  token: string,
  error: unknown,
  refusePaths: () => void,
) {
  if (error instanceof RefusedError && error.status === UNAUTHORISED) {
    settings.session?.refuse(token);
    return undefined;
  }
  if (error instanceof RefusedError && error.status === FORBIDDEN) {
    refusePaths();
    return undefined;
  }
  return RECONNECT_DELAY_MS;
}

/** Open one stream, and resolve how long to wait before the next one. */
function openStream(
  settings: GatewaySettings,
  paths: readonly string[],
  onEvent: (event: SseEvent) => void,
  signal: AbortSignal,
  refuse: (path: string) => void,
): Promise<number | undefined> {
  const token = settings.token();
  if (settings.session?.isRefused(token)) return Promise.resolve(undefined);
  return openSse(
    endpoint(settings, 'stream'),
    { paths },
    authorization(settings),
    onEvent,
    signal,
    settings.fetch,
  ).then(
    (result) => result.retryMs ?? RECONNECT_DELAY_MS,
    (error: unknown) =>
      retryAfter(settings, token, error, () => paths.forEach(refuse)),
  );
}

type Connect = (
  paths: string[],
  signal: AbortSignal,
) => Promise<number | undefined>;

/** A timer that runs one action later, replaced by the next, until stopped. */
function laterTimer() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  return {
    after(delayMs: number, action: () => void) {
      clearTimeout(timer);
      if (!stopped) timer = setTimeout(action, delayMs);
    },
    stop() {
      stopped = true;
      clearTimeout(timer);
    },
  };
}

/**
 * After a stream ends on its own, read down and open the next one later. A
 * stream without a delay had its token refused, so none is opened until a
 * change of paths asks again, and that one opens only with another token.
 */
function afterEnd(
  own: AbortController,
  state: StateCell,
  schedule: (delayMs: number) => void,
) {
  return (delayMs: number | undefined) => {
    if (own.signal.aborted) return;
    state.set('down');
    if (delayMs !== undefined) schedule(delayMs);
  };
}

/** One stream at a time, opened again on request or after it ends. */
function streamRunner(
  wanted: () => string[],
  connect: Connect,
  state: StateCell,
): Stream {
  const later = laterTimer();
  let current: AbortController | undefined;
  const schedule = (delayMs: number) => later.after(delayMs, open);
  function open() {
    current?.abort();
    const paths = wanted();
    current = paths.length > 0 ? new AbortController() : undefined;
    if (!current) return;
    state.set('connecting');
    const ended = afterEnd(current, state, schedule);
    // openStream already turns a failure into a delay. A rejection that still
    // got through is read the same way, so the stream is never left closed.
    connect(paths, current.signal).then(ended, () => ended(RECONNECT_DELAY_MS));
  }
  const stop = () => {
    later.stop();
    current?.abort();
  };
  return { schedule, stop };
}

/** Subscribe sinks, and open the stream again when the set of paths changes. */
function subscriber(
  book: PathBook,
  refused: Set<string>,
  stream: Stream,
): LiveTransport['subscribe'] {
  return (paths, sink) => {
    if (book.add(paths, sink)) stream.schedule(REOPEN_DELAY_MS);
    return () => {
      const gone = book.remove(paths, sink);
      gone.forEach((path) => refused.delete(path));
      if (gone.length > 0) stream.schedule(REOPEN_DELAY_MS);
    };
  };
}

export default function createGatewayTransport(
  settings: GatewaySettings & { readonly channel?: Channel },
): LiveTransport {
  const book = pathBook();
  const state = stateCell();
  const refused = new Set<string>();
  const channel = settings.channel ?? 'measured';
  const refuse = (path: string) => refused.add(path);
  const onEvent = eventHandler({
    sinksOf: book.sinksOf,
    setState: state.set,
    refuse,
    channel,
  });
  const wanted = () => book.paths().filter((path) => !refused.has(path));
  const connect: Connect = (paths, signal) =>
    openStream(settings, paths, onEvent, signal, refuse);
  const stream = streamRunner(wanted, connect, state);
  return {
    id: `signals gateway ${settings.url}`,
    subscribe: subscriber(book, refused, stream),
    state: state.get,
    onState: state.on,
    close: stream.stop,
  };
}
